import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    vendorId: v.id("vendors"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    content: v.string(),
    type: v.union(
      v.literal("form_submission"),
      v.literal("email"),
      v.literal("auto_negotiation")
    ),
    isDraft: v.boolean(),
    subject: v.optional(v.string()),
    from: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      sentAt: args.isDraft ? undefined : Date.now(),
    });
  },
});

export const listByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("asc")
      .collect();
  },
});

export const markSent = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isDraft: false,
      sentAt: Date.now(),
    });
  },
});
