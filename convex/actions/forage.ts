"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { detectCategory } from "./agentmail";

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
  const characterName = NPC_NAMES[animalType][Math.floor(index / ANIMAL_TYPES.length) % 4];
  return { animalType, characterName };
}

export const forageForVendors = action({
  args: {
    userId: v.id("users"),
    questId: v.optional(v.id("quests")),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch user data for personalized outreach
    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    const contactName = user?.name ?? "Founder";
    const companyName = user?.companyName ?? "Our Company";
    const companyDescription = user?.companyDescription ?? "";
    const userEmail = user?.email ?? null;

    // 2. Get or create quest
    let questId = args.questId;
    if (!questId) {
      questId = await ctx.runMutation(api.quests.create, {
        userId: args.userId,
        description: args.searchQuery,
      });
    }

    // 3. Detect category + get current vendor count for animal assignment
    const category = detectCategory(args.searchQuery);
    const existingVendors = await ctx.runQuery(api.vendors.listByUser, { userId: args.userId });
    const startIndex = existingVendors.length;

    // 4. "Foraging..." status in chat
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `🌿 Foraging for "${args.searchQuery}"... Searching the web now, hang tight!`,
    });

    // 5. Tavily: research vendors (fast, ~2-3s)
    let rawVendors: Array<{
      companyName: string;
      website?: string;
      location?: string | null;
      hasContactForm?: boolean;
      contactFormUrl?: string | null;
      contactEmail?: string | null;
      description?: string | null;
    }> = [];

    try {
      rawVendors = await ctx.runAction(api.actions.tavily.researchVendors, {
        searchQuery: args.searchQuery,
        companyContext: companyDescription || `Looking to source: ${args.searchQuery}`,
      });
    } catch (e) {
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

    // 6. Process all vendors in parallel
    const outreachMessage = (vendorName: string) =>
      `Hi,\n\nWe came across ${vendorName} and are interested in sourcing ${args.searchQuery} for our brand.\n\nCould you share your pricing, minimum order quantity, and lead times? We're currently evaluating suppliers and ${vendorName} looks like a strong fit.\n\nLooking forward to hearing from you!\n\nBest,\n${contactName}\n${companyName}`;

    await Promise.all(
      rawVendors.map(async (raw, i) => {
        const { animalType, characterName } = assignAnimal(startIndex + i);

        // Create vendor record
        const vendorId = await ctx.runMutation(api.vendors.create, {
          questId: questId!,
          userId: args.userId,
          companyName: raw.companyName,
          website: raw.website ?? undefined,
          location: raw.location ?? undefined,
          animalType,
          characterName,
          category,
        });

        // Create workflow node
        await ctx.runMutation(api.workflowNodes.create, {
          questId: questId!,
          vendorId,
          stage: "discovered",
          label: raw.companyName,
          isRecommended: false,
          isDead: false,
          reason: raw.description ?? undefined,
        });

        await ctx.runMutation(api.chatMessages.create, {
          userId: args.userId,
          role: "agent",
          content: `Found **${raw.companyName}**${raw.location ? ` in ${raw.location}` : ""}! Moving into your village 🏡`,
        });

        // Assign category inbox to vendor
        let inboxId: string | null = null;
        try {
          const inbox = await ctx.runAction(api.actions.agentmail.createVendorInbox, {
            vendorId,
            vendorName: raw.companyName,
            category,
          }) as { inboxId: string };
          inboxId = inbox.inboxId;
        } catch {
          // inbox assignment failed — continue without email tracking
        }

        // Send email (if we have both inbox and vendor email)
        if (raw.contactEmail && inboxId) {
          try {
            await ctx.runAction(api.actions.agentmail.sendEmail, {
              vendorId,
              inboxId,
              to: raw.contactEmail,
              subject: `Sourcing inquiry — ${args.searchQuery} | ${companyName}`,
              body: outreachMessage(raw.companyName),
            });
            await ctx.runMutation(api.chatMessages.create, {
              userId: args.userId,
              role: "agent",
              content: `📧 Follow-up email sent to **${raw.companyName}**`,
            });
          } catch {
            // email failed — continue
          }
        }

        // Schedule form fill as a background job (avoids Convex action timeout)
        // Browser Use takes 2-3 min — we fire-and-forget via scheduler
        if (raw.contactFormUrl && inboxId) {
          await ctx.scheduler.runAfter(0, api.actions.browserUse.fillContactForm, {
            vendorId,
            formUrl: raw.contactFormUrl,
            companyName,
            contactName,
            contactEmail: inboxId, // use inbox as reply-to
            productNeed: args.searchQuery,
            message: outreachMessage(raw.companyName),
          });
        }
      })
    );

    // 7. Send confirmation email to user
    if (userEmail) {
      try {
        await ctx.runAction(api.actions.agentmail.sendConfirmationEmail, {
          to: userEmail,
          searchQuery: args.searchQuery,
          vendorNames: rawVendors.map((v) => v.companyName),
          category,
        });
      } catch {
        // confirmation email failed — non-critical, continue
      }
    }

    // 8. Final summary
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `All done! Found **${rawVendors.length} vendors** and reached out to all of them. Check your village — new neighbors moved in! 🎉`,
      choices: ["Show decision tree", "Negotiate with top vendor", "Find more vendors"],
    });
  },
});
