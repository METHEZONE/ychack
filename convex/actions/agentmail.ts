"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

async function agentmailRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  if (!AGENTMAIL_API_KEY) throw new Error("AGENTMAIL_API_KEY not set");
  const res = await fetch(`${AGENTMAIL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${AGENTMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AgentMail ${method} ${path} failed: ${err}`);
  }
  return res.json();
}

export const createVendorInbox = action({
  args: {
    vendorId: v.id("vendors"),
    vendorName: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a dedicated inbox for this vendor thread
    const inbox = (await agentmailRequest("POST", "/inboxes", {
      display_name: `Forage - ${args.vendorName}`,
    })) as { id: string; address: string };

    // Store inbox ID on vendor
    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      agentmailInboxId: inbox.id,
    });

    return { inboxId: inbox.id, address: inbox.address };
  },
});

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
    if (!args.isDraft) {
      await agentmailRequest("POST", `/inboxes/${args.inboxId}/messages`, {
        to: [{ email: args.to }],
        subject: args.subject,
        text: args.body,
      });
    }

    // Log in messages table
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

export const listInboxMessages = action({
  args: { inboxId: v.string() },
  handler: async (_ctx, args) => {
    const data = (await agentmailRequest(
      "GET",
      `/inboxes/${args.inboxId}/messages`
    )) as { messages: unknown[] };
    return data.messages ?? [];
  },
});
