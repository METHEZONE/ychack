import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("agent")),
    content: v.string(),
    choices: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

export const listByUserRecent = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    return all.reverse();
  },
});
