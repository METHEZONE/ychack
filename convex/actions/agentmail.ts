"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { AgentMailClient } from "agentmail";
import type { Id } from "../_generated/dataModel";

function getClient() {
  if (!process.env.AGENTMAIL_API_KEY) throw new Error("AGENTMAIL_API_KEY not set");
  return new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
}

// ─── Category → dedicated inbox mapping ──────────────────────────────────────
// Each category gets its own inbox so replies are pre-sorted by type.
// VendorId is also embedded in the subject for precise reply matching.
type VendorCategory = "manufacturing" | "ingredients" | "legal" | "distribution" | "other";

const CATEGORY_INBOX: Record<VendorCategory, string> = {
  manufacturing: "forage-mfg@agentmail.to",
  ingredients:   "forage-ingredients@agentmail.to",
  legal:         "forage-legal@agentmail.to",
  distribution:  "forage-distribution@agentmail.to",
  other:         "zone@agentmail.to",
};

// Keyword-based category detection from search query
export function detectCategory(searchQuery: string): VendorCategory {
  const q = searchQuery.toLowerCase();
  if (/manufactur|oem|co.?pack|factory|produc|process|bottl|fill|brew|roast|blend/.test(q)) return "manufacturing";
  if (/ingredient|raw material|extract|flavor|base|spice|herb|grain|bean|fruit|oil/.test(q)) return "ingredients";
  if (/legal|regulat|fda|compliance|attorney|lawyer|patent|trademark|certif/.test(q)) return "legal";
  if (/distribut|wholesal|retail|resell|customer|buyer|import|export|broker/.test(q)) return "distribution";
  return "other";
}

// Embed vendorId in subject so we can match replies unambiguously
function subjectWithRef(subject: string, vendorId: string): string {
  return `${subject} [ref:${vendorId}]`;
}

// Parse vendorId from a reply subject ("Re: ... [ref:abc123]")
function parseVendorRef(subject: string): string | null {
  const m = subject.match(/\[ref:([^\]]+)\]/);
  return m?.[1] ?? null;
}

// ─── Assign category inbox to a vendor (no inbox creation needed) ─────────────
export const createVendorInbox = action({
  args: {
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cat = (args.category ?? "other") as VendorCategory;
    const inboxId = CATEGORY_INBOX[cat] ?? CATEGORY_INBOX.other;

    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      agentmailInboxId: inboxId,
    });

    return { inboxId };
  },
});

// ─── Send outreach email from the category inbox ──────────────────────────────
export const sendEmail = action({
  args: {
    vendorId: v.id("vendors"),
    inboxId: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const taggedSubject = subjectWithRef(args.subject, args.vendorId);

    if (!args.isDraft) {
      const mail = getClient();
      await mail.inboxes.messages.send(args.inboxId, {
        to: [args.to],
        subject: taggedSubject,
        text: args.body,
      });
    }

    await ctx.runMutation(api.messages.create, {
      vendorId: args.vendorId,
      direction: "outbound",
      content: args.body,
      type: "email",
      isDraft: args.isDraft ?? false,
      subject: taggedSubject,
    });

    if (!args.isDraft) {
      await ctx.runMutation(api.vendors.updateStage, {
        vendorId: args.vendorId,
        stage: "contacted",
        emailSent: true,
      });
    }

    return { sent: !args.isDraft };
  },
});

// ─── Full outreach: send from category inbox ──────────────────────────────────
export const outreachVendor = action({
  args: {
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    vendorEmail: v.string(),
    userCompanyName: v.string(),
    userContactName: v.string(),
    productNeed: v.string(),
    emailBody: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mail = getClient();
    const cat = (args.category ?? "other") as VendorCategory;
    const inboxId = CATEGORY_INBOX[cat] ?? CATEGORY_INBOX.other;
    const subject = `Partnership Inquiry — ${args.userCompanyName}`;
    const taggedSubject = subjectWithRef(subject, args.vendorId);

    await mail.inboxes.messages.send(inboxId, {
      to: [args.vendorEmail],
      subject: taggedSubject,
      text: args.emailBody,
    });

    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      agentmailInboxId: inboxId,
      emailSent: true,
    });

    await ctx.runMutation(api.messages.create, {
      vendorId: args.vendorId,
      direction: "outbound",
      content: args.emailBody,
      type: "email",
      isDraft: false,
      subject: taggedSubject,
    });

    return { inboxId, sent: true };
  },
});

// ─── List messages in an inbox ────────────────────────────────────────────────
export const listInboxMessages = action({
  args: { inboxId: v.string() },
  handler: async (_ctx, args) => {
    const mail = getClient();
    const data = await mail.inboxes.messages.list(args.inboxId);
    return data.messages ?? [];
  },
});

// ─── Send confirmation email to user after forage ────────────────────────────
export const sendConfirmationEmail = action({
  args: {
    to: v.string(),
    searchQuery: v.string(),
    vendorNames: v.array(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const mail = getClient();
    const cat = (args.category ?? "other") as VendorCategory;
    const inboxId = CATEGORY_INBOX[cat] ?? CATEGORY_INBOX.other;

    const vendorList = args.vendorNames.map((n, i) => `${i + 1}. ${n}`).join("\n");
    const body = [
      `Your Forage agent just sent sourcing inquiries for: "${args.searchQuery}"`,
      "",
      "Vendors contacted:",
      vendorList,
      "",
      "You'll see replies in your Forage village as vendors respond. 🌿",
      "",
      "— Forage Agent",
    ].join("\n");

    await mail.inboxes.messages.send(inboxId, {
      to: [args.to],
      subject: `✅ Forage sent ${args.vendorNames.length} inquiries for "${args.searchQuery}"`,
      text: body,
    });

    return { sent: true };
  },
});

// ─── Send confirmation email to user after form submission ──────────────────
export const sendFormConfirmationEmail = action({
  args: {
    to: v.string(),
    vendorName: v.string(),
    vendorWebsite: v.string(),
    submittedMessage: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const mail = getClient();
    const cat = (args.category ?? "other") as VendorCategory;
    const inboxId = CATEGORY_INBOX[cat] ?? CATEGORY_INBOX.other;

    const body = [
      `Your Forage agent just submitted a contact form for ${args.vendorName}.`,
      "",
      `Vendor website: ${args.vendorWebsite}`,
      "",
      "Message submitted:",
      "---",
      args.submittedMessage,
      "---",
      "",
      "You'll be notified when they respond. 🌿",
      "",
      "— Forage Agent",
    ].join("\n");

    await mail.inboxes.messages.send(inboxId, {
      to: [args.to],
      subject: `📋 Forage submitted a contact form to ${args.vendorName}`,
      text: body,
    });

    return { sent: true };
  },
});

// ─── Webhook: handle inbound reply from a vendor ──────────────────────────────
// 1. Matches vendor via [ref:vendorId] in subject
// 2. Runs Claude to analyze reply + draft follow-up
// 3. Saves draft and notifies user for approval
export const handleInboundEmail = action({
  args: {
    inboxId: v.string(),
    fromEmail: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // ── Resolve vendor ────────────────────────────────────────────────────────
    const vendorRef = parseVendorRef(args.subject);
    let resolvedId: Id<"vendors"> | null = null;

    if (vendorRef) {
      resolvedId = vendorRef as Id<"vendors">;
    } else {
      const vendor = await ctx.runQuery(api.vendors.getByInboxId, { inboxId: args.inboxId });
      if (!vendor) {
        console.warn("Inbound email for unknown inbox:", args.inboxId);
        return;
      }
      resolvedId = vendor._id;
    }

    const vendor = await ctx.runQuery(api.vendors.get, { vendorId: resolvedId });
    if (!vendor) return;

    // ── Save inbound message ──────────────────────────────────────────────────
    await ctx.runMutation(api.messages.create, {
      vendorId: resolvedId,
      direction: "inbound",
      content: args.body,
      type: "email",
      isDraft: false,
      subject: args.subject,
      from: args.fromEmail,
    });

    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: resolvedId,
      stage: "replied",
    });

    // ── Get user + quest context ──────────────────────────────────────────────
    const user = await ctx.runQuery(api.users.get, { userId: vendor.userId });
    const quest = await ctx.runQuery(api.quests.get, { questId: vendor.questId });
    const contactName = user?.name ?? "Founder";
    const companyName = user?.companyName ?? "Our Company";
    const productNeed = quest?.description ?? "our product";

    // ── Claude: analyze reply + draft follow-up ───────────────────────────────
    let analysis: {
      summary: string;
      sentiment: string;
      quote: { price: string | null; moq: string | null; leadTime: string | null };
      keyPoints: string[];
      draftReply: string;
    };

    try {
      analysis = await ctx.runAction(api.actions.claude.analyzeVendorReply, {
        vendorName: vendor.companyName,
        replyContent: args.body,
        originalQuery: productNeed,
        senderCompanyName: companyName,
        senderContactName: contactName,
      });
    } catch {
      // Claude failed — still notify user, just no draft
      await ctx.runMutation(api.chatMessages.create, {
        userId: vendor.userId,
        role: "agent",
        content: `📨 **${vendor.companyName}** replied to your inquiry! Check the message thread.`,
        choices: ["View messages", "Find more vendors"],
      });
      return;
    }

    // ── Save quote data if extracted ──────────────────────────────────────────
    const hasQuote = analysis.quote.price || analysis.quote.moq || analysis.quote.leadTime;
    if (hasQuote) {
      await ctx.runMutation(api.vendors.updateStage, {
        vendorId: resolvedId,
        stage: "replied",
        quote: {
          price: analysis.quote.price ?? undefined,
          moq: analysis.quote.moq ?? undefined,
          leadTime: analysis.quote.leadTime ?? undefined,
        },
        agentNotes: analysis.summary,
      });
    }

    // ── Save draft reply ──────────────────────────────────────────────────────
    const draftSubject = args.subject.startsWith("Re:") ? args.subject : `Re: ${args.subject}`;
    const draftMessageId = await ctx.runMutation(api.messages.create, {
      vendorId: resolvedId,
      direction: "outbound",
      content: analysis.draftReply,
      type: "email",
      isDraft: true,
      subject: draftSubject,
    });

    // ── Notify user with approval prompt ─────────────────────────────────────
    const quoteText = hasQuote
      ? `\n💰 Quote: ${[
          analysis.quote.price && `Price: ${analysis.quote.price}`,
          analysis.quote.moq && `MOQ: ${analysis.quote.moq}`,
          analysis.quote.leadTime && `Lead time: ${analysis.quote.leadTime}`,
        ].filter(Boolean).join(" · ")}`
      : "";

    const keyPointsText = analysis.keyPoints.length
      ? `\n• ${analysis.keyPoints.join("\n• ")}`
      : "";

    await ctx.runMutation(api.chatMessages.create, {
      userId: vendor.userId,
      role: "agent",
      content: `📨 **${vendor.companyName}** replied!\n\n${analysis.summary}${quoteText}${keyPointsText}\n\n---\n**Draft reply ready.** Want me to send it?`,
      choices: ["Send reply ✓", "Edit first", "Skip for now"],
      metadata: {
        action: "approve_reply",
        vendorId: resolvedId,
        draftMessageId,
        inboxId: vendor.agentmailInboxId,
        toEmail: args.fromEmail,
        subject: draftSubject,
      },
    });
  },
});

// ─── Send a stored draft reply (called when user approves) ────────────────────
export const sendDraftReply = action({
  args: {
    draftMessageId: v.id("messages"),
    vendorId: v.id("vendors"),
    toEmail: v.string(),
    inboxId: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    const mail = getClient();

    // Get draft content
    const messages = await ctx.runQuery(api.messages.listByVendor, { vendorId: args.vendorId });
    const draft = messages.find((m) => m._id === args.draftMessageId);
    if (!draft || !draft.isDraft) throw new Error("Draft not found or already sent");

    // Send
    await mail.inboxes.messages.send(args.inboxId, {
      to: [args.toEmail],
      subject: subjectWithRef(args.subject, args.vendorId),
      text: draft.content,
    });

    // Mark sent
    await ctx.runMutation(api.messages.markSent, { messageId: args.draftMessageId });

    // Advance vendor stage
    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "negotiating",
      emailSent: true,
    });

    return { sent: true };
  },
});
