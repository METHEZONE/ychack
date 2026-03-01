import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    googleId: v.optional(v.string()), // Google OAuth provider account ID
    avatar: v.optional(v.string()), // selected animal avatar for the player
    companyName: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    website: v.optional(v.string()),
    extractedCompanyData: v.optional(v.any()), // scraped from website
    needs: v.optional(v.array(v.string())), // what they're looking for
    isNewBusiness: v.optional(v.boolean()),
    villageName: v.optional(v.string()),
    sessionToken: v.optional(v.string()), // for local (non-Google) session persistence
    activeQuestId: v.optional(v.string()), // currently active quest
    tutorialDone: v.optional(v.boolean()),
    demoSeeded: v.optional(v.boolean()),
    productionScale: v.optional(v.string()), // e.g. "500-1000 units, ~$5,000"
    timeline: v.optional(v.string()), // e.g. "Samples by April, launch by summer"
    geoPreference: v.optional(v.string()), // e.g. "US preferred, open to Asia"
    gomiOnboardingDone: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_google_id", ["googleId"])
    .index("by_session_token", ["sessionToken"]),

  quests: defineTable({
    userId: v.id("users"),
    description: v.string(), // "Find sticker vendors in Shenzhen"
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("paused")
    ),
    animalType: v.optional(v.string()), // agent character managing this quest
    characterName: v.optional(v.string()), // agent NPC name
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  vendors: defineTable({
    questId: v.id("quests"),
    userId: v.id("users"),
    companyName: v.string(),
    website: v.optional(v.string()),
    location: v.optional(v.string()),
    animalType: v.string(), // "fox" | "raccoon" | "bear" | "frog" | etc.
    characterName: v.string(), // auto-generated NPC name
    contactEmail: v.optional(v.string()),
    formSubmitted: v.boolean(),
    emailSent: v.boolean(),
    agentmailInboxId: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("manufacturing"),
      v.literal("ingredients"),
      v.literal("legal"),
      v.literal("distribution"),
      v.literal("other"),
    )),
    stage: v.union(
      v.literal("discovered"),
      v.literal("contacted"),
      v.literal("replied"),
      v.literal("negotiating"),
      v.literal("closed"),
      v.literal("dead")
    ),
    deadReason: v.optional(v.string()), // "no reply" | "too expensive" | "rejected"
    quote: v.optional(
      v.object({
        price: v.optional(v.string()),
        moq: v.optional(v.string()),
        leadTime: v.optional(v.string()),
      })
    ),
    agentNotes: v.optional(v.string()), // AI assessment
    userApproved: v.optional(v.boolean()), // user approved vendor into village
    userSeen: v.optional(v.boolean()), // user has seen this vendor notification
    formFailureReason: v.optional(v.string()), // why form submission failed
    formMissingFields: v.optional(v.array(v.string())), // fields Browser Use couldn't fill
    autoReply: v.optional(v.boolean()), // auto-reply to vendor emails
    browserSessionId: v.optional(v.string()), // Browser Use session ID for form submission
    positionX: v.optional(v.number()), // village x position
    positionY: v.optional(v.number()), // village y position
  })
    .index("by_quest", ["questId"])
    .index("by_user", ["userId"])
    .index("by_inbox", ["agentmailInboxId"]),

  messages: defineTable({
    vendorId: v.id("vendors"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    content: v.string(),
    type: v.union(
      v.literal("form_submission"),
      v.literal("email"),
      v.literal("auto_negotiation")
    ),
    isDraft: v.boolean(),
    sentAt: v.optional(v.number()),
    subject: v.optional(v.string()),
    from: v.optional(v.string()),
  }).index("by_vendor", ["vendorId"]),

  chatMessages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("agent")),
    content: v.string(),
    choices: v.optional(v.array(v.string())), // Claude Code-style choice buttons
    metadata: v.optional(v.any()), // e.g. { questId, vendorId }
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  workflowNodes: defineTable({
    questId: v.id("quests"),
    vendorId: v.optional(v.id("vendors")),
    parentNodeId: v.optional(v.id("workflowNodes")),
    stage: v.string(),
    label: v.string(),
    isRecommended: v.boolean(),
    reason: v.optional(v.string()), // AI explanation
    isDead: v.boolean(),
    deadReason: v.optional(v.string()),
  }).index("by_quest", ["questId"]),
});
