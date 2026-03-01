import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    questId: v.id("quests"),
    userId: v.id("users"),
    companyName: v.string(),
    website: v.optional(v.string()),
    location: v.optional(v.string()),
    animalType: v.string(),
    characterName: v.string(),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    category: v.optional(v.union(
      v.literal("manufacturing"),
      v.literal("ingredients"),
      v.literal("legal"),
      v.literal("distribution"),
      v.literal("other"),
    )),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("vendors", {
      ...args,
      formSubmitted: false,
      emailSent: false,
      stage: "discovered",
    });
  },
});

export const listByQuest = query({
  args: { questId: v.id("quests") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_quest", (q) => q.eq("questId", args.questId))
      .collect();
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vendorId);
  },
});

export const updateStage = mutation({
  args: {
    vendorId: v.id("vendors"),
    stage: v.union(
      v.literal("discovered"),
      v.literal("contacted"),
      v.literal("replied"),
      v.literal("negotiating"),
      v.literal("closed"),
      v.literal("dead")
    ),
    deadReason: v.optional(v.string()),
    agentNotes: v.optional(v.string()),
    quote: v.optional(
      v.object({
        price: v.optional(v.string()),
        moq: v.optional(v.string()),
        leadTime: v.optional(v.string()),
      })
    ),
    contactEmail: v.optional(v.string()),
    formSubmitted: v.optional(v.boolean()),
    emailSent: v.optional(v.boolean()),
    agentmailInboxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { vendorId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(vendorId, patch);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("vendors").collect();
  },
});

export const getByInboxId = query({
  args: { inboxId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_inbox", (q) => q.eq("agentmailInboxId", args.inboxId))
      .first();
  },
});

export const updatePosition = mutation({
  args: {
    vendorId: v.id("vendors"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vendorId, {
      positionX: args.positionX,
      positionY: args.positionY,
    });
  },
});
