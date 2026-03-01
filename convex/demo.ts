import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Demo vendor data — realistic-looking vendors for hackathon demo
const DEMO_VENDORS = [
  {
    companyName: "SunFab Textiles Co.",
    website: "https://sunfabtextiles.com",
    location: "Guangzhou, China",
    animalType: "fox",
    characterName: "Rex",
    stage: "replied" as const,
    contactEmail: "info@sunfabtextiles.com",
    formSubmitted: true,
    emailSent: true,
    quote: { price: "$2.40/meter", moq: "500 meters", leadTime: "3-4 weeks" },
    agentNotes: "Strong reputation for cotton blends. MOQ is reasonable for a startup. Recommend requesting a sample before committing.",
  },
  {
    companyName: "EcoThread Vietnam",
    website: "https://ecothreadvietnam.com",
    location: "Ho Chi Minh City, Vietnam",
    animalType: "rabbit",
    characterName: "Clover",
    stage: "contacted" as const,
    contactEmail: "sales@ecothreadvn.com",
    formSubmitted: true,
    emailSent: true,
    quote: undefined,
    agentNotes: undefined,
  },
  {
    companyName: "Mumbai Cotton Mills",
    website: "https://mumbaicotton.in",
    location: "Mumbai, India",
    animalType: "bear",
    characterName: "Bruno",
    stage: "negotiating" as const,
    contactEmail: "export@mumbaicotton.in",
    formSubmitted: true,
    emailSent: true,
    quote: { price: "$1.95/meter", moq: "1000 meters", leadTime: "5-6 weeks" },
    agentNotes: "Lowest price but higher MOQ. Good for scale. Currently negotiating on MOQ reduction to 500m.",
  },
  {
    companyName: "Nordic Linen House",
    website: "https://nordiclinenhouse.dk",
    location: "Copenhagen, Denmark",
    animalType: "deer",
    characterName: "Fern",
    stage: "discovered" as const,
    contactEmail: undefined,
    formSubmitted: false,
    emailSent: false,
    quote: undefined,
    agentNotes: undefined,
  },
];

export const seedDemoVendors = mutation({
  args: {
    userId: v.id("users"),
    questId: v.optional(v.id("quests")),
  },
  handler: async (ctx, args) => {
    // Check if demo vendors already exist
    const existing = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    if (existing.length > 0) return { seeded: false, count: existing.length };

    // Create a quest if needed
    let questId = args.questId;
    if (!questId) {
      questId = await ctx.db.insert("quests", {
        userId: args.userId,
        description: "Find cotton fabric manufacturers",
        status: "active",
        createdAt: Date.now(),
      });
    }

    // Seed vendors
    for (const v of DEMO_VENDORS) {
      const vendorId = await ctx.db.insert("vendors", {
        questId,
        userId: args.userId,
        companyName: v.companyName,
        website: v.website,
        location: v.location,
        animalType: v.animalType,
        characterName: v.characterName,
        stage: v.stage,
        contactEmail: v.contactEmail,
        formSubmitted: v.formSubmitted,
        emailSent: v.emailSent,
        quote: v.quote,
        agentNotes: v.agentNotes,
      });

      // Workflow node for decision tree
      await ctx.db.insert("workflowNodes", {
        questId,
        vendorId,
        stage: v.stage,
        label: v.companyName,
        isRecommended: (v.stage as string) === "replied" || (v.stage as string) === "negotiating",
        isDead: (v.stage as string) === "dead",
        reason: v.agentNotes,
      });
    }

    // Welcome chat message
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      role: "agent",
      content: `🌿 Welcome back! I found 4 cotton fabric vendors for you — they've moved into your village. Rex from SunFab already replied with a quote! Click any NPC to see their deal status.`,
      choices: ["Show me Rex's quote", "Find more vendors", "What should I do next?"],
      createdAt: Date.now(),
    });

    return { seeded: true, count: DEMO_VENDORS.length, questId };
  },
});
