"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// ─── Smart Form Submission Orchestrator ─────────────────────────────────────────
// 1. Gather context (vendor, user, chat history, quest)
// 2. Claude composes a personalized form message
// 3. Schedule Browser Use to find + fill + submit the form (fire-and-forget)
// 4. Notify user via chat that submission is in progress
export const smartFormSubmission = action({
  args: {
    vendorId: v.id("vendors"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // ── 1. Gather context ──────────────────────────────────────────────────────
    const vendor = await ctx.runQuery(api.vendors.get, { vendorId: args.vendorId });
    if (!vendor) throw new Error("Vendor not found");
    if (!vendor.website) throw new Error("Vendor has no website");
    if (vendor.formSubmitted) throw new Error("Form already submitted for this vendor");

    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    const contactName = user?.name ?? "Founder";
    const companyName = user?.companyName ?? "Our Company";
    const companyDescription = user?.companyDescription ?? "";
    const userEmail = user?.email ?? null;

    const quest = await ctx.runQuery(api.quests.get, { questId: vendor.questId });
    const productNeed = quest?.description ?? "sourcing inquiry";

    // Get recent chat history for personalization
    const recentChat = await ctx.runQuery(api.chatMessages.listByUserRecent, {
      userId: args.userId,
      limit: 10,
    });
    const chatHistory = recentChat.map((m) => ({
      role: m.role as "user" | "agent",
      content: m.content,
    }));

    // ── 2. Claude composes personalized message ──────────────────────────────
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `📋 Preparing contact form submission for **${vendor.companyName}**... Composing a personalized message now.`,
      metadata: { action: "form_preparing", vendorId: args.vendorId },
    });

    let formMessage: string;
    try {
      formMessage = await ctx.runAction(api.actions.claude.composeFormMessage, {
        vendorName: vendor.companyName,
        vendorWebsite: vendor.website,
        userCompanyName: companyName,
        userContactName: contactName,
        userCompanyDescription: companyDescription || undefined,
        productNeed,
        chatHistory,
      });
    } catch {
      formMessage = `Hi,\n\nWe came across ${vendor.companyName} and are interested in sourcing ${productNeed} for our brand.\n\nCould you share your pricing, minimum order quantity, and lead times? We're currently evaluating suppliers and ${vendor.companyName} looks like a strong fit.\n\nLooking forward to hearing from you!\n\nBest,\n${contactName}\n${companyName}`;
    }

    // ── 3. Get or ensure inbox for reply tracking ──────────────────────────────
    let inboxEmail = vendor.agentmailInboxId;
    if (!inboxEmail) {
      try {
        const inbox = await ctx.runAction(api.actions.agentmail.createVendorInbox, {
          vendorId: args.vendorId,
          vendorName: vendor.companyName,
          category: vendor.category ?? undefined,
        }) as { inboxId: string };
        inboxEmail = inbox.inboxId;
      } catch {
        inboxEmail = "zone@agentmail.to";
      }
    }

    // ── 4. Schedule Browser Use form fill (fire-and-forget) ──────────────────
    await ctx.scheduler.runAfter(0, api.actions.browserUse.smartFillContactForm, {
      vendorId: args.vendorId,
      vendorWebsite: vendor.website,
      companyName,
      contactName,
      contactEmail: inboxEmail,
      productNeed,
      message: formMessage,
      userId: args.userId,
      userEmail: userEmail ?? undefined,
      category: vendor.category ?? undefined,
    });

    // ── 5. Notify user that it's in progress ──────────────────────────────────
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `🌐 Browser agent is now visiting **${vendor.companyName}**'s website to find and fill their contact form. This may take 2-3 minutes — I'll let you know when it's done!`,
      metadata: { action: "form_in_progress", vendorId: args.vendorId },
    });

    return { scheduled: true, message: formMessage };
  },
});
