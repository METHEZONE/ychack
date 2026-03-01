"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const ANIMAL_TYPES = [
  "fox", "raccoon", "bear", "frog", "rabbit",
  "squirrel", "deer", "owl", "hedgehog", "cat",
] as const;

type AnimalType = typeof ANIMAL_TYPES[number];

const NPC_NAMES: Record<AnimalType, string[]> = {
  fox: ["Rex", "Fiona", "Rusty", "Vixen"],
  raccoon: ["Rocky", "Bandit", "Remy", "Scout"],
  bear: ["Bruno", "Honey", "Kodiak", "Bindi"],
  frog: ["Hop", "Lilly", "Croaker", "Jade"],
  rabbit: ["Clover", "Hazel", "Bun", "Pip"],
  squirrel: ["Acorn", "Hazel", "Chip", "Nutmeg"],
  deer: ["Bambi", "Fern", "Buck", "Maple"],
  owl: ["Hoot", "Sage", "Wren", "Luna"],
  hedgehog: ["Spike", "Bramble", "Prick", "Holly"],
  cat: ["Mochi", "Biscuit", "Nori", "Pesto"],
};

function assignAnimal(index: number): { animalType: AnimalType; characterName: string } {
  const animalType = ANIMAL_TYPES[index % ANIMAL_TYPES.length];
  const names = NPC_NAMES[animalType];
  const characterName = names[Math.floor(index / ANIMAL_TYPES.length) % names.length];
  return { animalType, characterName };
}

export const forageForVendors = action({
  args: {
    userId: v.id("users"),
    questId: v.optional(v.id("quests")),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get or create quest
    let questId = args.questId;
    if (!questId) {
      questId = await ctx.runMutation(api.quests.create, {
        userId: args.userId,
        description: args.searchQuery,
      });
    }

    // 2. Get current vendor count for animal assignment
    const existingVendors = await ctx.runQuery(api.vendors.listByUser, {
      userId: args.userId,
    });
    let vendorIndex = existingVendors.length;

    // 3. "Foraging..." status in chat
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `🌿 Foraging for "${args.searchQuery}"... Searching the web now, hang tight!`,
    });

    // 4. Browser Use: find vendors
    let rawVendors: Array<{
      companyName: string;
      website?: string;
      location?: string;
      hasContactForm?: boolean;
      contactFormUrl?: string;
      contactEmail?: string;
      description?: string;
    }> = [];

    try {
      rawVendors = await ctx.runAction(api.actions.browserUse.findVendors, {
        questId,
        searchQuery: args.searchQuery,
      });
    } catch {
      await ctx.runMutation(api.chatMessages.create, {
        userId: args.userId,
        role: "agent",
        content: "Had trouble searching the web just now. Want to try again?",
        choices: ["Try again", "Try different keywords"],
      });
      return;
    }

    if (rawVendors.length === 0) {
      await ctx.runMutation(api.chatMessages.create, {
        userId: args.userId,
        role: "agent",
        content: "Couldn't find vendors for that search. Let's try something else?",
        choices: ["Broaden the search", "Try a different product", "Search by location"],
      });
      return;
    }

    // 5. For each vendor: create in DB + chat update + outreach
    for (const raw of rawVendors) {
      const { animalType, characterName } = assignAnimal(vendorIndex);

      const vendorId = await ctx.runMutation(api.vendors.create, {
        questId,
        userId: args.userId,
        companyName: raw.companyName,
        website: raw.website,
        location: raw.location,
        animalType,
        characterName,
      });

      // Workflow node for decision tree
      await ctx.runMutation(api.workflowNodes.create, {
        questId,
        vendorId,
        stage: "discovered",
        label: raw.companyName,
        isRecommended: false,
        isDead: false,
        reason: raw.description,
      });

      // Real-time chat update — vendor appears in village
      await ctx.runMutation(api.chatMessages.create, {
        userId: args.userId,
        role: "agent",
        content: `Found **${raw.companyName}**${raw.location ? ` in ${raw.location}` : ""}! They're moving into your village. 🏡`,
      });

      // Form outreach
      if (raw.contactFormUrl) {
        try {
          await ctx.runAction(api.actions.browserUse.fillContactForm, {
            vendorId,
            formUrl: raw.contactFormUrl,
            companyName: "Your Company",
            productNeed: args.searchQuery,
            contactName: "Founder",
            contactEmail: "hello@forage.ai",
            message: `Hi! We're interested in sourcing ${args.searchQuery}. Could you share your pricing, MOQ, and lead time? We're evaluating a few suppliers right now.`,
          });
          await ctx.runMutation(api.chatMessages.create, {
            userId: args.userId,
            role: "agent",
            content: `📋 Filled inquiry form for ${raw.companyName}!`,
          });
        } catch {
          // form fill failed — continue
        }
      }

      // Email outreach
      if (raw.contactEmail) {
        try {
          const inbox = await ctx.runAction(api.actions.agentmail.createVendorInbox, {
            vendorId,
            vendorName: raw.companyName,
          }) as { inboxId: string; address: string };

          await ctx.runAction(api.actions.agentmail.sendEmail, {
            vendorId,
            inboxId: inbox.inboxId,
            to: raw.contactEmail,
            subject: `Sourcing inquiry — ${args.searchQuery}`,
            body: `Hi,\n\nWe came across ${raw.companyName} and are interested in sourcing ${args.searchQuery} for our product.\n\nCould you share your pricing, minimum order quantity, and lead times?\n\nLooking forward to hearing from you!\n\nBest,\nFounder\n\nSent via Forage`,
          });

          await ctx.runMutation(api.chatMessages.create, {
            userId: args.userId,
            role: "agent",
            content: `📧 Follow-up email sent to ${raw.companyName}!`,
          });
        } catch {
          // email failed — continue
        }
      }

      vendorIndex++;
    }

    // 6. Final summary
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `All done! Found ${rawVendors.length} vendors and reached out to all of them. Check your village — new neighbors have moved in! 🎉`,
      choices: ["Show decision tree", "Negotiate with top vendor", "Find more vendors"],
    });
  },
});
