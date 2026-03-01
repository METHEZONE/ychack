import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.id("users"),
    description: v.string(),
    animalType: v.optional(v.string()),
    characterName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quests", {
      userId: args.userId,
      description: args.description,
      status: "active",
      animalType: args.animalType,
      characterName: args.characterName,
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

// Delete a quest and all its workflow nodes + vendors
export const remove = mutation({
  args: { questId: v.id("quests") },
  handler: async (ctx, args) => {
    // Delete workflow nodes
    const nodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_quest", (q) => q.eq("questId", args.questId))
      .collect();
    for (const n of nodes) await ctx.db.delete(n._id);

    // Delete vendors
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_quest", (q) => q.eq("questId", args.questId))
      .collect();
    for (const v of vendors) await ctx.db.delete(v._id);

    // Delete quest itself
    await ctx.db.delete(args.questId);
  },
});
