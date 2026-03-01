import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.id("users"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quests", {
      userId: args.userId,
      description: args.description,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    questId: v.id("quests"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("paused")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.questId, { status: args.status });
  },
});

export const get = query({
  args: { questId: v.id("quests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.questId);
  },
});
