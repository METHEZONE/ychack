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

// ─── Analyze a vendor's reply email ──────────────────────────────────────────
// Extracts quote data + drafts a follow-up in one pass
export const analyzeVendorReply = action({
  args: {
    vendorName: v.string(),
    replyContent: v.string(),
    originalQuery: v.string(),
    senderCompanyName: v.string(), // our company
    senderContactName: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `You are Forage's AI sourcing agent. A vendor just replied to our sourcing inquiry.

Vendor: ${args.vendorName}
What we're sourcing: ${args.originalQuery}
Our company: ${args.senderCompanyName}
Our contact: ${args.senderContactName}

Vendor's reply:
---
${args.replyContent}
---

Do two things:

1. Extract structured data from the reply (use null if not mentioned):
{
  "summary": "1-2 sentence summary of their reply",
  "sentiment": "positive" | "neutral" | "negative" | "no_reply_needed",
  "quote": {
    "price": "e.g. $2.50/unit or null",
    "moq": "e.g. 500 units or null",
    "leadTime": "e.g. 4 weeks or null"
  },
  "keyPoints": ["point 1", "point 2"]
}

2. Write a short, professional follow-up reply (2-3 paragraphs).
- If they gave a quote: acknowledge it, ask for a sample or next step
- If they asked for more info: provide what they need
- If negative/not a fit: thank them politely
- Keep it warm and human, not salesy

Return ONLY valid JSON with this exact shape:
{
  "summary": "...",
  "sentiment": "...",
  "quote": { "price": ..., "moq": ..., "leadTime": ... },
  "keyPoints": [...],
  "draftReply": "full email body here"
}`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as {
        summary: string;
        sentiment: string;
        quote: { price: string | null; moq: string | null; leadTime: string | null };
        keyPoints: string[];
        draftReply: string;
      };
    } catch {
      console.error("Failed to parse vendor reply analysis:", text);
    }
    // Fallback
    return {
      summary: "Vendor replied — see full message.",
      sentiment: "neutral",
      quote: { price: null, moq: null, leadTime: null },
      keyPoints: [],
      draftReply: `Thank you for getting back to us! We're very interested in moving forward.\n\nCould you share more details about your pricing and minimum order quantities?\n\nBest,\n${args.senderContactName}\n${args.senderCompanyName}`,
    };
  },
});

// ─── Scrape a company website + extract structured info ──────────────────────
// Tavily extract (~1s) → Claude to structure the raw content (~1s) = ~2s total
export const scrapeAndAnalyzeWebsite = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY not set");

    // Step 1: Tavily extract — get raw page content
    const extractRes = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        urls: [args.url],
      }),
    });

    if (!extractRes.ok) throw new Error(`Tavily extract failed: ${extractRes.status}`);
    const extractData = await extractRes.json() as {
      results?: Array<{ url: string; raw_content: string }>;
    };
    const rawContent = extractData.results?.[0]?.raw_content ?? "";
    if (!rawContent) throw new Error("No content extracted from website");

    // Step 2: Claude to structure the raw content
    const prompt = `Extract company information from this website content.

URL: ${args.url}
Content:
---
${rawContent.slice(0, 3000)}
---

Return ONLY valid JSON:
{
  "companyName": "official company name",
  "description": "1-2 sentence description of what they do and who they serve",
  "products": "main products or services they offer",
  "location": "city, state/country or null if not found",
  "email": "contact email or null if not found"
}`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as {
        companyName: string;
        description: string;
        products: string;
        location: string | null;
        email: string | null;
      };
    } catch {
      console.error("Failed to parse website analysis:", text);
    }
    return null;
  },
});

// ─── Compose a personalized form message from chat history ────────────────────
export const composeFormMessage = action({
  args: {
    vendorName: v.string(),
    vendorWebsite: v.optional(v.string()),
    userCompanyName: v.string(),
    userContactName: v.string(),
    userCompanyDescription: v.optional(v.string()),
    productNeed: v.string(),
    chatHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("agent")),
        content: v.string(),
      })
    ),
  },
  handler: async (_ctx, args) => {
    const chatContext = args.chatHistory.length
      ? `Recent conversation:\n${args.chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}`
      : "No prior conversation.";

    const prompt = `You are drafting a contact/inquiry form message on behalf of ${args.userCompanyName} (${args.userContactName}).

Vendor: ${args.vendorName}
${args.vendorWebsite ? `Website: ${args.vendorWebsite}` : ""}
Product need: ${args.productNeed}
${args.userCompanyDescription ? `Company: ${args.userCompanyDescription}` : ""}

${chatContext}

Write a professional, friendly inquiry message suitable for a vendor's contact/quote form.
- 2-3 short paragraphs
- Mention what we're looking for (from the product need and chat context)
- Ask about pricing, MOQ, and lead times
- Keep it warm and concise
- Do NOT include a subject line — just the message body
- Sign off with the contact name and company name

Return ONLY the message body text.`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as { type: string; text: string }).text;
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
