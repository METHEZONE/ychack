import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    avatar: v.optional(v.string()),
    villageName: v.optional(v.string()),
    isNewBusiness: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      name: args.name,
      avatar: args.avatar,
      villageName: args.villageName,
      isNewBusiness: args.isNewBusiness ?? false,
    });
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateCompanyData = mutation({
  args: {
    userId: v.id("users"),
    companyName: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    website: v.optional(v.string()),
    extractedCompanyData: v.optional(v.any()),
    needs: v.optional(v.array(v.string())),
    isNewBusiness: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    // Filter out undefined values
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(userId, patch);
  },
});
