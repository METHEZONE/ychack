"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

const TAVILY_BASE = "https://api.tavily.com";

function getKey() {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY not set");
  return process.env.TAVILY_API_KEY;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilySearchResponse {
  answer?: string;
  results: TavilySearchResult[];
}

interface TavilyExtractResponse {
  results: Array<{ url: string; raw_content: string }>;
  failed_results: Array<{ url: string; error: string }>;
}

// ─── Search: find vendors matching a query ────────────────────────────────────
// Fast (~1s), replaces Browser Use findVendors for discovery
export const searchVendors = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const res = await fetch(`${TAVILY_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: getKey(),
        query: args.query,
        search_depth: "advanced",
        max_results: args.maxResults ?? 7,
        include_answer: true,
        include_domains: [], // no restriction
        exclude_domains: ["linkedin.com", "reddit.com", "yelp.com", "facebook.com"],
      }),
    });

    if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
    const data: TavilySearchResponse = await res.json();

    return {
      answer: data.answer ?? null,
      results: data.results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score,
      })),
    };
  },
});

// ─── Extract: scrape company info from a URL ──────────────────────────────────
// Fast (~1s), replaces Browser Use scrapeWebsite
export const extractCompanyInfo = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args) => {
    const res = await fetch(`${TAVILY_BASE}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: getKey(),
        urls: [args.url],
      }),
    });

    if (!res.ok) throw new Error(`Tavily extract failed: ${res.status}`);
    const data: TavilyExtractResponse = await res.json();

    const result = data.results?.[0];
    if (!result) return null;

    return {
      url: result.url,
      rawContent: result.raw_content,
    };
  },
});

// ─── Research: find vendors + extract their pages (combined, still fast) ──────
// Returns structured vendor data ready to be stored in Convex
export const researchVendors = action({
  args: {
    searchQuery: v.string(),
    companyContext: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    // Step 1: Search for vendors (1s)
    const searchRes = await fetch(`${TAVILY_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: getKey(),
        query: `${args.searchQuery} manufacturer supplier co-packer B2B`,
        search_depth: "advanced",
        max_results: 6,
        include_answer: false,
        exclude_domains: ["linkedin.com", "reddit.com", "yelp.com", "facebook.com", "instagram.com", "twitter.com", "alibaba.com"],
      }),
    });

    if (!searchRes.ok) throw new Error(`Tavily search failed: ${searchRes.status}`);
    const searchData: TavilySearchResponse = await searchRes.json();

    // Step 2: Extract top 4 vendor pages in parallel (2-3s)
    const topResults = searchData.results.slice(0, 4);
    const extractRes = await fetch(`${TAVILY_BASE}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: getKey(),
        urls: topResults.map((r) => r.url),
      }),
    });

    const extractData: TavilyExtractResponse = extractRes.ok
      ? await extractRes.json()
      : { results: [], failed_results: [] };

    const extractMap = new Map(extractData.results.map((r) => [r.url, r.raw_content]));

    // Step 3: Build vendor objects
    const vendors = topResults.map((result) => {
      const content = extractMap.get(result.url) ?? result.content;

      // Extract contact email from page content
      const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const contactEmail = emailMatch?.[0] ?? null;

      // Detect if inquiry form likely exists
      const hasContactForm = /contact|inquiry|quote|get.?started|reach.?out/i.test(content);

      // Extract location hint
      const locationMatch = content.match(
        /(?:located|headquartered|based)\s+in\s+([A-Z][a-zA-Z\s,]+)|([A-Z][a-zA-Z]+,\s*[A-Z]{2})/
      );
      const location = locationMatch?.[1] ?? locationMatch?.[2] ?? null;

      return {
        companyName: result.title.split(/[-|–]/)[0].trim(),
        website: result.url,
        location,
        contactEmail,
        hasContactForm,
        contactFormUrl: hasContactForm ? result.url : null,
        description: result.content?.slice(0, 150) ?? null,
        snippet: content.slice(0, 500),
      };
    });

    return vendors;
  },
});
