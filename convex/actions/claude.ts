"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { Laminar } from "@lmnr-ai/lmnr";

// Initialize Laminar once at module level — auto-instruments all Anthropic calls
Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

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
// Tavily extract (main + /contact + /about) → Claude structure → ~3s total
// Never throws — always returns best-effort data
export const scrapeAndAnalyzeWebsite = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    // Fallback name from domain (e.g. "thezonebio.com" → "Thezonebio")
    function nameFromUrl(url: string): string {
      try {
        return new URL(url).hostname
          .replace(/^www\./, "")
          .split(".")[0]
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      } catch {
        return "";
      }
    }

    const base = args.url.replace(/\/+$/, "");
    const urls = [base, `${base}/contact`, `${base}/contact-us`, `${base}/about`];

    // Step 1: Tavily extract — scrape multiple pages in one call
    // Partial failures (404s) are OK — Tavily returns successful ones in results[]
    let allContent = "";
    try {
      if (!process.env.TAVILY_API_KEY) throw new Error("no key");
      const extractRes = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, urls }),
      });

      if (extractRes.ok) {
        const data = await extractRes.json() as {
          results?: Array<{ url: string; raw_content: string }>;
        };
        allContent = (data.results ?? [])
          .map((r) => r.raw_content)
          .filter(Boolean)
          .join("\n\n--- PAGE BREAK ---\n\n");
      }
    } catch {
      // Tavily completely failed — fall through with empty content
    }

    // If we got nothing at all, return minimal fallback immediately
    if (!allContent.trim()) {
      return {
        companyName: nameFromUrl(args.url),
        description: "",
        products: "",
        location: null,
        email: null,
      };
    }

    // Step 2: Claude structures the raw content
    const prompt = `Extract company information from this website content.
Multiple pages were scraped (homepage, contact, about) — use all of them.

URL: ${args.url}
---
${allContent.slice(0, 5000)}
---

Rules:
- companyName: the official brand/company name (not a page title like "Contact Us")
- description: 1-2 sentences about what they do and who they serve
- products: their main products or services (brief list or phrase)
- location: city, state or country — null if not found
- email: any contact/sales/hello/info email you find — null if not found
  (check mailto: links, "email us at X", "reach us at X" patterns)

Return ONLY this JSON (no markdown, no explanation):
{"companyName":"...","description":"...","products":"...","location":null,"email":null}`;

    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const text = (msg.content[0] as { type: string; text: string }).text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as {
          companyName: string;
          description: string;
          products: string;
          location: string | null;
          email: string | null;
        };
        // Ensure companyName is never empty
        if (!parsed.companyName) parsed.companyName = nameFromUrl(args.url);
        return parsed;
      }
    } catch {
      console.error("scrapeAndAnalyzeWebsite: Claude parse failed");
    }

    // Claude failed — return what we can from the URL
    return {
      companyName: nameFromUrl(args.url),
      description: "",
      products: "",
      location: null,
      email: null,
    };
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
    productionScale: v.optional(v.string()),
    timeline: v.optional(v.string()),
    geoPreference: v.optional(v.string()),
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

    const scaleContext = [
      args.productionScale ? `Production scale: ${args.productionScale}` : "",
      args.timeline ? `Timeline: ${args.timeline}` : "",
      args.geoPreference ? `Vendor location preference: ${args.geoPreference}` : "",
    ].filter(Boolean).join("\n");

    const prompt = `You are drafting a contact/inquiry form message on behalf of ${args.userCompanyName} (${args.userContactName}).

Vendor: ${args.vendorName}
${args.vendorWebsite ? `Website: ${args.vendorWebsite}` : ""}
Product need: ${args.productNeed}
${args.userCompanyDescription ? `Company: ${args.userCompanyDescription}` : ""}
${scaleContext ? `\n${scaleContext}` : ""}

${chatContext}

Write a professional, friendly inquiry message suitable for a vendor's contact/quote form.
- 2-3 short paragraphs
- Mention what we're looking for (from the product need and chat context)
- Include production scale, timeline, and location preferences if provided
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

// ─── Pick the best vendor from a quest's options ─────────────────────────────
export const recommendBestVendor = action({
  args: {
    vendors: v.array(v.object({
      vendorId: v.string(),
      companyName: v.string(),
      stage: v.string(),
      quote: v.optional(v.any()),
      agentNotes: v.optional(v.string()),
      location: v.optional(v.string()),
    })),
    questDescription: v.string(),
  },
  handler: async (_ctx, args) => {
    const list = args.vendors.map((v, i) =>
      `${i + 1}. ${v.companyName} (stage: ${v.stage})` +
      (v.quote?.price ? `, price: ${v.quote.price}` : "") +
      (v.quote?.moq ? `, MOQ: ${v.quote.moq}` : "") +
      (v.quote?.leadTime ? `, lead time: ${v.quote.leadTime}` : "") +
      (v.location ? `, location: ${v.location}` : "") +
      (v.agentNotes ? `\n   Agent notes: ${v.agentNotes}` : "")
    ).join("\n");

    const prompt = `You are Forage's AI sourcing agent helping a founder choose the best vendor.

What they're sourcing: "${args.questDescription}"

Vendor options:
${list}

Pick the single best vendor. Prioritize: has a quote > lowest price > fastest lead time > closest location > most advanced stage.

Return ONLY this JSON (no markdown):
{"vendorId":"<exact vendorId from list>","reason":"1-2 sentences explaining why this vendor is the top pick"}

If no vendors have enough info to decide, return {"vendorId":null,"reason":"Not enough quote data yet — contact more vendors first"}`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as { vendorId: string | null; reason: string };
    } catch {
      console.error("recommendBestVendor parse failed:", text);
    }
    return null;
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
