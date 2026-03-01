"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { AgentMailClient } from "agentmail";

function getClient() {
  if (!process.env.AGENTMAIL_API_KEY) throw new Error("AGENTMAIL_API_KEY not set");
  return new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
}

// Slugify vendor name → inbox username (e.g. "Intelligent Blends" → "forage-intelligent-blends")
function toInboxUsername(vendorName: string): string {
  return "forage-" + vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
}

// ─── Create a per-vendor inbox ────────────────────────────────────────────────
export const createVendorInbox = action({
  args: {
    vendorId: v.id("vendors"),
    vendorName: v.string(),
  },
  handler: async (ctx, args) => {
    const mail = getClient();

    const inbox = await mail.inboxes.create({
      username: toInboxUsername(args.vendorName),
      displayName: "Forage Agent",
    });

    // inboxId IS the full email address (e.g. forage-acme@agentmail.to)
    const inboxId = inbox.inboxId;

    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      agentmailInboxId: inboxId,
    });

    return { inboxId };
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

    // 1. Create dedicated inbox
    const inbox = await mail.inboxes.create({
      username: toInboxUsername(args.vendorName),
      displayName: "Forage Agent",
    });
    const inboxId = inbox.inboxId;

    // 2. Send follow-up email
    await mail.inboxes.messages.send(inboxId, {
      to: [args.vendorEmail],
      subject: `Partnership Inquiry — ${args.userCompanyName}`,
      text: args.emailBody,
    });

    // 3. Update Convex
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
      subject: `Partnership Inquiry — ${args.userCompanyName}`,
    });

    return { inboxId, sent: true };
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
    // Find vendor by inbox ID
    const vendors = await ctx.runQuery(api.vendors.listAll);
    const vendor = vendors.find((v) => v.agentmailInboxId === args.inboxId);
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
