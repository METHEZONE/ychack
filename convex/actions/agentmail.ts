"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { AgentMailClient } from "agentmail";

function getClient() {
  if (!process.env.AGENTMAIL_API_KEY) throw new Error("AGENTMAIL_API_KEY not set");
  return new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
}

// Master inbox — shared across all vendor outreach to avoid per-inbox limits.
// Replies are matched by vendorId embedded in the subject line.
const MASTER_INBOX = "zone@agentmail.to";

// ─── Get or return master inbox (no creation needed) ─────────────────────────
export const createVendorInbox = action({
  args: {
    vendorId: v.id("vendors"),
    vendorName: v.string(),
  },
  handler: async (ctx, args) => {
    // Use the shared master inbox; store it on the vendor record
    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      agentmailInboxId: MASTER_INBOX,
    });

    return { inboxId: MASTER_INBOX };
  },
});

// ─── Send email from a vendor inbox ──────────────────────────────────────────
export const sendEmail = action({
  args: {
    vendorId: v.id("vendors"),
    inboxId: v.string(),       // the @agentmail.to address
    to: v.string(),            // vendor's email
    subject: v.string(),
    body: v.string(),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.isDraft) {
      const mail = getClient();
      await mail.inboxes.messages.send(args.inboxId, {
        to: [args.to],
        subject: args.subject,
        text: args.body,
      });
    }

    await ctx.runMutation(api.messages.create, {
      vendorId: args.vendorId,
      direction: "outbound",
      content: args.body,
      type: "email",
      isDraft: args.isDraft ?? false,
      subject: args.subject,
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

// ─── Full outreach: create inbox + send follow-up email ───────────────────────
// Call this after Browser Use has scraped the vendor and (attempted) the form.
export const outreachVendor = action({
  args: {
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    vendorEmail: v.string(),
    userCompanyName: v.string(),
    userContactName: v.string(),
    productNeed: v.string(),
    emailBody: v.string(), // Claude-drafted email body passed in
  },
  handler: async (ctx, args) => {
    const mail = getClient();

    // Send from master inbox
    await mail.inboxes.messages.send(MASTER_INBOX, {
      to: [args.vendorEmail],
      subject: `Partnership Inquiry — ${args.userCompanyName}`,
      text: args.emailBody,
    });

    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      agentmailInboxId: MASTER_INBOX,
      emailSent: true,
    });

    await ctx.runMutation(api.messages.create, {
      vendorId: args.vendorId,
      direction: "outbound",
      content: args.emailBody,
      type: "email",
      isDraft: false,
      subject: `Partnership Inquiry — ${args.userCompanyName}`,
    });

    return { inboxId: MASTER_INBOX, sent: true };
  },
});

// ─── List messages in a vendor inbox ─────────────────────────────────────────
export const listInboxMessages = action({
  args: { inboxId: v.string() },
  handler: async (_ctx, args) => {
    const mail = getClient();
    const data = await mail.inboxes.messages.list(args.inboxId);
    return data.messages ?? [];
  },
});

// ─── Send confirmation email to the user after outreach ──────────────────────
export const sendConfirmationEmail = action({
  args: {
    to: v.string(),
    searchQuery: v.string(),
    vendorNames: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const mail = getClient();

    const vendorList = args.vendorNames.map((n, i) => `${i + 1}. ${n}`).join("\n");
    const body = [
      `Your Forage agent just sent sourcing inquiries for: "${args.searchQuery}"`,
      "",
      `Vendors contacted:`,
      vendorList,
      "",
      "You'll see replies in your Forage village as vendors respond. 🌿",
      "",
      "— Forage Agent",
    ].join("\n");

    await mail.inboxes.messages.send(MASTER_INBOX, {
      to: [args.to],
      subject: `✅ Forage sent ${args.vendorNames.length} inquiries for "${args.searchQuery}"`,
      text: body,
    });

    return { sent: true };
  },
});

// ─── Webhook: AgentMail calls this when a vendor replies ─────────────────────
// Registered in convex/http.ts as POST /agentmail-webhook
export const handleInboundEmail = action({
  args: {
    inboxId: v.string(),
    fromEmail: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // Find vendor by inbox ID (indexed lookup)
    const vendor = await ctx.runQuery(api.vendors.getByInboxId, { inboxId: args.inboxId });
    if (!vendor) {
      console.warn("Inbound email for unknown inbox:", args.inboxId);
      return;
    }

    // Log inbound message
    await ctx.runMutation(api.messages.create, {
      vendorId: vendor._id,
      direction: "inbound",
      content: args.body,
      type: "email",
      isDraft: false,
      subject: args.subject,
      from: args.fromEmail,
    });

    // Advance vendor stage
    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: vendor._id,
      stage: "replied",
    });
  },
});
