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

// Domains that are directories, aggregators, blogs — not actual vendors
const EXCLUDED_DOMAINS = [
  "linkedin.com", "reddit.com", "yelp.com", "facebook.com",
  "instagram.com", "twitter.com", "x.com",
  "alibaba.com", "aliexpress.com", "made-in-china.com",
  "indiamart.com", "dhgate.com", "global-sources.com",
  "thomasnet.com", "globalspec.com", "kompass.com",
  "medium.com", "wordpress.com", "blogspot.com", "substack.com",
  "usetorg.com", "sourceify.co", "supplierlist.com",
  "quora.com", "trustpilot.com", "glassdoor.com",
];

// Returns true if the result looks like a list/blog/directory page, not a company site
function isAggregatorResult(r: TavilySearchResult): boolean {
  const title = r.title.toLowerCase();
  const url = r.url.toLowerCase();

  // "15 Best...", "Top 10...", "List of...", "Complete Guide to..."
  if (/^(\d+\s+)?(best|top\s*\d*|list of|guide to|how to|complete guide|ultimate guide|what is)/i.test(title)) return true;

  // "X Suppliers/Manufacturers" in blog-style title
  if (/\b(suppliers?|manufacturers?|companies|vendors?)\b/.test(title) && /\b(best|top|\d+)\b/.test(title)) return true;

  // URL path signals it's a blog/article/directory listing
  if (/\/(blog|article|guide|list|news|post|category|tag|directory|resources?)\//i.test(url)) return true;

  return false;
}

// Extract a clean company name from domain when page title is unreliable
function nameFromDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const base = hostname.split(".")[0]; // e.g. "customcoffeemanufacturer"
    return base
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
}

// Pick a company name: prefer first segment of page title; avoid list-article titles
function extractCompanyName(title: string, url: string): string {
  // Definitely a list article — skip title entirely
  if (/^(\d+\s+)?(best|top\s*\d*|list of|guide to|how to|complete guide|ultimate guide)/i.test(title)) {
    return nameFromDomain(url);
  }
  // Take first segment before common separators (handles "Acme Corp | OEM Coffee Roasting")
  let clean = title.split(/\s*[-–|:]\s*/)[0].trim();
  // Strip page-level prefixes ("Contact Us - Acme" → "Acme")
  clean = clean.replace(/^(contact\s+us|contact|about\s+us|about|home|welcome\s+to|welcome)\s+/i, "").trim();
  return clean || nameFromDomain(url);
}

// Get root domain for dedup (e.g. "privatelabelcoffeemanufacturer.com")
function rootDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── Search: find vendors matching a query ────────────────────────────────────
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
        exclude_domains: EXCLUDED_DOMAINS,
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
export const extractCompanyInfo = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    const res = await fetch(`${TAVILY_BASE}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: getKey(), urls: [args.url] }),
    });

    if (!res.ok) throw new Error(`Tavily extract failed: ${res.status}`);
    const data: TavilyExtractResponse = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    return { url: result.url, rawContent: result.raw_content };
  },
});

// ─── Research: find vendors + extract their pages (combined, still fast) ──────
export const researchVendors = action({
  args: {
    searchQuery: v.string(),
    companyContext: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    // Step 1: Search — query targets actual company sites, not list articles
    // "get a quote" / "minimum order" signals a real B2B supplier page
    const searchRes = await fetch(`${TAVILY_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: getKey(),
        query: `${args.searchQuery} factory OEM private label "get a quote" OR "minimum order" OR "contact us"`,
        search_depth: "advanced",
        max_results: 10, // fetch more so we have room to filter
        include_answer: false,
        exclude_domains: EXCLUDED_DOMAINS,
      }),
    });

    if (!searchRes.ok) throw new Error(`Tavily search failed: ${searchRes.status}`);
    const searchData: TavilySearchResponse = await searchRes.json();

    // Step 2: Filter out aggregators + deduplicate by root domain
    const seenDomains = new Set<string>();
    const filtered = searchData.results
      .filter((r) => {
        if (isAggregatorResult(r)) return false;
        const domain = rootDomain(r.url);
        if (seenDomains.has(domain)) return false;
        seenDomains.add(domain);
        return true;
      })
      .slice(0, 4);

    if (filtered.length === 0) return [];

    // Step 3: Extract pages in parallel
    const extractRes = await fetch(`${TAVILY_BASE}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: getKey(),
        urls: filtered.map((r) => r.url),
      }),
    });

    const extractData: TavilyExtractResponse = extractRes.ok
      ? await extractRes.json()
      : { results: [], failed_results: [] };

    const extractMap = new Map(extractData.results.map((r) => [r.url, r.raw_content]));

    // Step 4: Build vendor objects
    return filtered.map((result) => {
      const content = extractMap.get(result.url) ?? result.content;

      // Email: skip true no-reply addresses (noreply, privacy, unsubscribe)
      // Keep info@, support@, contact@ — these are legitimate B2B vendor contacts
      const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
      const contactEmail =
        emailMatches.find((e) => !/noreply|no-reply|privacy@|unsubscribe/i.test(e)) ??
        emailMatches[0] ??
        null;

      // Contact form: look for form-specific content, not just any "contact" mention
      const hasContactForm = /\b(inquiry form|contact form|request a quote|get a quote|reach out|send us a message)\b/i.test(content);

      // Location
      const locationMatch = content.match(
        /(?:located|headquartered|based)\s+in\s+([A-Z][a-zA-Z\s,]+(?:USA|US|UK|China|India|Germany|Canada|Australia)?)|([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|USA|UK|China|India|Germany))/
      );
      const location = locationMatch?.[1]?.trim() ?? locationMatch?.[2]?.trim() ?? null;

      return {
        companyName: extractCompanyName(result.title, result.url),
        website: result.url,
        location,
        contactEmail,
        hasContactForm,
        contactFormUrl: hasContactForm ? result.url : null,
        description: result.content?.slice(0, 200) ?? null,
        snippet: content.slice(0, 500),
      };
    });
  },
});
