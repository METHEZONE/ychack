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

// Look up user by Google ID (for auto-login on return)
export const getByGoogleId = query({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_google_id", (q) => q.eq("googleId", args.googleId))
      .first();
  },
});

// Look up user by email (fallback for Google users)
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Look up user by session token (for local users)
export const getBySessionToken = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();
  },
});

// Set Google ID on user (called after first Google login)
export const setGoogleId = mutation({
  args: {
    userId: v.id("users"),
    googleId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { googleId: args.googleId });
  },
});

// Generate and set session token (for local users)
export const setSessionToken = mutation({
  args: {
    userId: v.id("users"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { sessionToken: args.sessionToken });
  },
});

// Update user preferences (tutorialDone, demoSeeded, activeQuestId)
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    tutorialDone: v.optional(v.boolean()),
    demoSeeded: v.optional(v.boolean()),
    activeQuestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(userId, patch);
  },
});

// Wipe all data for a user (quests, vendors, workflow nodes, messages, chat messages, user)
export const nukeUserData = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Delete all vendors + their messages + workflow nodes
    const vendors = await ctx.db.query("vendors").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const v of vendors) {
      const msgs = await ctx.db.query("messages").withIndex("by_vendor", (q) => q.eq("vendorId", v._id)).collect();
      for (const m of msgs) await ctx.db.delete(m._id);
      await ctx.db.delete(v._id);
    }

    // Delete workflow nodes via quests
    const quests = await ctx.db.query("quests").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const quest of quests) {
      const nodes = await ctx.db.query("workflowNodes").withIndex("by_quest", (q) => q.eq("questId", quest._id)).collect();
      for (const n of nodes) await ctx.db.delete(n._id);
      await ctx.db.delete(quest._id);
    }

    // Delete chat messages
    const chats = await ctx.db.query("chatMessages").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const c of chats) await ctx.db.delete(c._id);

    // Delete user
    await ctx.db.delete(args.userId);
  },
});

export const updateCompanyData = mutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    companyName: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    website: v.optional(v.string()),
    extractedCompanyData: v.optional(v.any()),
    needs: v.optional(v.array(v.string())),
    isNewBusiness: v.optional(v.boolean()),
    productionScale: v.optional(v.string()),
    timeline: v.optional(v.string()),
    geoPreference: v.optional(v.string()),
    gomiOnboardingDone: v.optional(v.boolean()),
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
