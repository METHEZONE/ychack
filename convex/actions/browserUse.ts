"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const BASE = "https://api.browser-use.com/api/v3";
const TERMINAL = new Set(["finished", "idle", "stopped", "completed"]);
const FAILED = new Set(["failed", "timed_out"]);

function headers() {
  if (!process.env.BROWSER_USE_API_KEY) throw new Error("BROWSER_USE_API_KEY not set");
  return {
    "X-Browser-Use-API-Key": process.env.BROWSER_USE_API_KEY,
    "Content-Type": "application/json",
  };
}

interface Session {
  id: string;
  status: string;
  output?: string;
  liveUrl?: string;
  totalCostUsd?: string;
}

// Create a session and poll until done (max 5 min)
async function runSession(task: string, model = "bu-mini", maxCostUsd = 0.5): Promise<Session> {
  const createRes = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ task, model, max_cost_usd: maxCostUsd }),
  });
  if (!createRes.ok) throw new Error(`Browser Use create failed: ${createRes.status} ${await createRes.text()}`);
  const session: Session = await createRes.json();

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(`${BASE}/sessions/${session.id}`, { headers: headers() });
    if (!pollRes.ok) continue;
    const data: Session = await pollRes.json();
    if (TERMINAL.has(data.status)) return data;
    if (FAILED.has(data.status)) throw new Error(`Browser Use session ${data.status}: ${data.output ?? ""}`);
  }
  throw new Error("Browser Use timed out after 5 minutes");
}

function extractJson<T>(text: string, arrayMode = false): T | null {
  try {
    const pattern = arrayMode ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = text.match(pattern);
    if (match) return JSON.parse(match[0]) as T;
  } catch {}
  return null;
}

// ─── Find vendors matching a search query ─────────────────────────────────────
export const findVendors = action({
  args: {
    questId: v.id("quests"),
    searchQuery: v.string(),
    companyContext: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const task = `
Search the web for B2B vendors matching: "${args.searchQuery}"
${args.companyContext ? `Buyer context: ${args.companyContext}` : ""}

Find 3-5 real vendors. For each:
1. Get company name, website URL, location
2. Check if they have an inquiry/contact/quote form and its URL
3. Extract visible contact email

Return ONLY a JSON array:
[
  {
    "companyName": "...",
    "website": "...",
    "location": "...",
    "hasContactForm": true,
    "contactFormUrl": "...",
    "contactEmail": "...",
    "description": "one sentence about what they offer"
  }
]`.trim();

    const session = await runSession(task);
    const vendors = extractJson<Array<{
      companyName: string;
      website?: string;
      location?: string;
      hasContactForm?: boolean;
      contactFormUrl?: string;
      contactEmail?: string;
      description?: string;
    }>>(session.output ?? "", true);

    return vendors ?? [];
  },
});

// ─── Scrape a vendor website ───────────────────────────────────────────────────
export const scrapeWebsite = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    const task = `
Visit ${args.url} and extract:
- Company name
- Products / services offered
- Location / headquarters
- Any pricing or MOQ information visible
- Contact email address(es)
- URL of inquiry/contact/quote form if present
- Apparent company size (small/medium/large)

Return ONLY JSON:
{
  "companyName": "...",
  "products": "...",
  "location": "...",
  "pricing": "...",
  "moq": "...",
  "contactEmail": "...",
  "contactFormUrl": "...",
  "companySize": "small|medium|large"
}`.trim();

    const session = await runSession(task);
    return extractJson<Record<string, string>>(session.output ?? "");
  },
});

// ─── Fill an inquiry form ─────────────────────────────────────────────────────
export const fillContactForm = action({
  args: {
    vendorId: v.id("vendors"),
    formUrl: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(), // AgentMail inbox address so replies come to us
    contactPhone: v.optional(v.string()),
    productNeed: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const task = `
Go to ${args.formUrl} and fill out the inquiry or contact form with:
- Contact Name: ${args.contactName}
- Company / Business Name: ${args.companyName}
- Email: ${args.contactEmail}
- Phone: ${args.contactPhone ?? ""}
- Product interest / type: ${args.productNeed}
- Message / project description: "${args.message}"

For dropdowns like "I Am Currently", select the closest option to "Starting a new brand" or "Entrepreneur".
For budget dropdowns, select a mid-range option.
Check any relevant product type checkboxes based on the product need.

If a reCAPTCHA appears, attempt to solve it. If it cannot be solved automatically, stop and report.

Submit the form when all required fields are filled.

Return "success" if submitted, or "blocked: <reason>" if not.`.trim();

    const session = await runSession(task, "bu-mini", 0.75);
    const output = session.output ?? "";
    const success = output.toLowerCase().includes("success") && !output.toLowerCase().includes("blocked");

    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      formSubmitted: success,
    });

    if (success) {
      await ctx.runMutation(api.messages.create, {
        vendorId: args.vendorId,
        direction: "outbound",
        content: args.message,
        type: "form_submission",
        isDraft: false,
      });
    }

    return { success, output };
  },
});

// ─── Full vendor outreach: scrape + fill form (single Browser Use session) ────
// This is the main action called per vendor found during foraging.
// After this, call agentmail.outreachVendor to send the email follow-up.
export const outreachVendorFull = action({
  args: {
    vendorId: v.id("vendors"),
    vendorWebsite: v.string(),
    contactName: v.string(),
    companyName: v.string(),
    inboxEmail: v.string(), // AgentMail inbox address
    contactPhone: v.optional(v.string()),
    productNeed: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const task = `
You are a B2B sourcing agent for "${args.companyName}".

Go to ${args.vendorWebsite} and do TWO things:

STEP 1 — Extract company info:
Collect: company name, products/services, location, MOQ (if mentioned), pricing (if mentioned), contact email.

STEP 2 — Find and fill the inquiry/contact form:
- Contact Name: ${args.contactName}
- Business Name: ${args.companyName}
- Email: ${args.inboxEmail}
- Phone: ${args.contactPhone ?? ""}
- Product interest: ${args.productNeed}
- Message: "${args.message}"
- For dropdowns: select the most appropriate option (e.g. "Starting a new brand", mid-range budget)
- Check relevant product type checkboxes
- Attempt reCAPTCHA if present; if unsolvable, report but still return company info.
- Submit the form.

Return JSON:
{
  "companyInfo": {
    "companyName": "...",
    "products": "...",
    "location": "...",
    "moq": "...",
    "contactEmail": "...",
    "notes": "..."
  },
  "formFound": true,
  "formSubmitted": true,
  "formUrl": "...",
  "blockedReason": "..."
}`.trim();

    const session = await runSession(task, "bu-mini", 1.0);
    const result = extractJson<{
      companyInfo?: Record<string, string>;
      formFound?: boolean;
      formSubmitted?: boolean;
      formUrl?: string;
      blockedReason?: string;
    }>(session.output ?? "");

    const formSubmitted = result?.formSubmitted ?? false;
    const contactEmail = result?.companyInfo?.contactEmail;

    // Update vendor with scraped data
    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      formSubmitted,
      ...(contactEmail ? { contactEmail } : {}),
    });

    if (formSubmitted) {
      await ctx.runMutation(api.messages.create, {
        vendorId: args.vendorId,
        direction: "outbound",
        content: args.message,
        type: "form_submission",
        isDraft: false,
      });
    }

    return {
      companyInfo: result?.companyInfo ?? null,
      formFound: result?.formFound ?? false,
      formSubmitted,
      formUrl: result?.formUrl ?? null,
      contactEmail: contactEmail ?? null,
      sessionCost: session.totalCostUsd ?? null,
    };
  },
});
