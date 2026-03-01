import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    questId: v.id("quests"),
    vendorId: v.optional(v.id("vendors")),
    parentNodeId: v.optional(v.id("workflowNodes")),
    stage: v.string(),
    label: v.string(),
    isRecommended: v.boolean(),
    reason: v.optional(v.string()),
    isDead: v.boolean(),
    deadReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowNodes", args);
  },
});

export const listByQuest = query({
  args: { questId: v.id("quests") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflowNodes")
      .withIndex("by_quest", (q) => q.eq("questId", args.questId))
      .collect();
  },
});

export const update = mutation({
  args: {
    nodeId: v.id("workflowNodes"),
    stage: v.optional(v.string()),
    isRecommended: v.optional(v.boolean()),
    reason: v.optional(v.string()),
    isDead: v.optional(v.boolean()),
    deadReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { nodeId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(nodeId, patch);
  },
});
