"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";

export const analyzeVendor = action({
  args: {
    vendorName: v.string(),
    vendorWebsite: v.optional(v.string()),
    vendorLocation: v.optional(v.string()),
    quote: v.optional(v.any()),
    otherVendorQuotes: v.optional(v.array(v.any())),
    userNeed: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `You are Forage's AI sourcing agent. Analyze this vendor and give a brief, helpful assessment.

Vendor: ${args.vendorName}
${args.vendorLocation ? `Location: ${args.vendorLocation}` : ""}
${args.vendorWebsite ? `Website: ${args.vendorWebsite}` : ""}
${args.quote ? `Their quote: ${JSON.stringify(args.quote)}` : "No quote yet"}
${args.otherVendorQuotes?.length ? `Other vendors' quotes for comparison: ${JSON.stringify(args.otherVendorQuotes)}` : ""}
User needs: ${args.userNeed}

Give a 1-2 sentence assessment of this vendor and whether you recommend them. Be direct and practical.
Focus on: price vs market, response quality, reliability signals.
End with a clear recommendation: "Recommend" or "Consider alternatives".`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as { type: string; text: string }).text;
  },
});

export const draftNegotiationEmail = action({
  args: {
    vendorName: v.string(),
    vendorEmail: v.string(),
    currentQuote: v.any(),
    userCompanyName: v.string(),
    userNeed: v.string(),
    competitorQuotes: v.optional(v.array(v.any())),
    negotiationGoal: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const prompt = `You are drafting a professional negotiation email on behalf of ${args.userCompanyName}.

Vendor: ${args.vendorName}
Current quote: ${JSON.stringify(args.currentQuote)}
${args.competitorQuotes?.length ? `Competitor quotes (use as leverage): ${JSON.stringify(args.competitorQuotes)}` : ""}
What we need: ${args.userNeed}
Negotiation goal: ${args.negotiationGoal ?? "Better pricing or terms"}

Write a professional, friendly but firm negotiation email.
- Keep it concise (3-4 paragraphs max)
- Reference competitor pricing if available (without naming the competitor)
- Ask for specific improvements (lower price, lower MOQ, faster lead time)
- Keep the relationship warm

Return ONLY the email body, no subject line, no preamble.`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as { type: string; text: string }).text;
  },
});

export const generateChatResponse = action({
  args: {
    userMessage: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("agent")),
        content: v.string(),
      })
    ),
    userContext: v.optional(v.any()), // company info, active quests, vendors found
  },
  handler: async (_ctx, args) => {
    const systemPrompt = `You are Forage's AI sourcing agent — a friendly, competent assistant that helps founders source physical product vendors.
Your personality: knowledgeable, direct, warm. Like a brilliant friend who knows supply chains.

${args.userContext ? `User context: ${JSON.stringify(args.userContext)}` : ""}

When you respond:
1. Be concise and helpful
2. When the user needs to make a decision, offer 2-4 clear choices (format as JSON array in <choices> tags)
3. When you're about to start a task (like foraging for vendors), confirm understanding first
4. Use "Forage" to describe your search actions: "Foraging for...", "Found...", etc.

If you want to present choices, include them AFTER your message like:
<choices>["Option A", "Option B", "Option C"]</choices>`;

    const messages = args.conversationHistory.map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));
    messages.push({ role: "user", content: args.userMessage });

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const fullText = (msg.content[0] as { type: string; text: string }).text;

    // Extract choices if present
    const choicesMatch = fullText.match(/<choices>([\s\S]*?)<\/choices>/);
    let choices: string[] | undefined;
    let responseText = fullText;

    if (choicesMatch) {
      try {
        choices = JSON.parse(choicesMatch[1]);
        responseText = fullText.replace(/<choices>[\s\S]*?<\/choices>/, "").trim();
      } catch {
        // ignore parse error
      }
    }

    return { text: responseText, choices };
  },
});

export const analyzeProductNeed = action({
  args: {
    productIdea: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `A founder wants to launch: "${args.productIdea}"

Break down what they'll need to source. List 4-8 supply chain components they need to find vendors for.

Return as JSON array:
[
  { "category": "...", "description": "what they need", "searchQuery": "google search to find vendors" },
  ...
]

Only return the JSON array.`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch {
      console.error("Failed to parse product analysis:", text);
    }
    return [];
  },
});
