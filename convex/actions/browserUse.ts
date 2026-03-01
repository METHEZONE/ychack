"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const BROWSER_USE_API_KEY = process.env.BROWSER_USE_API_KEY;
const BROWSER_USE_BASE = "https://api.browser-use.com/api/v1";

async function runBrowserTask(task: string): Promise<string> {
  if (!BROWSER_USE_API_KEY) throw new Error("BROWSER_USE_API_KEY not set");

  // Start task
  const startRes = await fetch(`${BROWSER_USE_BASE}/run-task`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BROWSER_USE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task }),
  });
  if (!startRes.ok) throw new Error(`Browser Use error: ${startRes.status}`);
  const { task_id } = await startRes.json();

  // Poll for result (max 120s)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${BROWSER_USE_BASE}/task/${task_id}`, {
      headers: { Authorization: `Bearer ${BROWSER_USE_API_KEY}` },
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    if (data.status === "finished") return data.output ?? "";
    if (data.status === "failed") throw new Error(`Task failed: ${data.error}`);
  }
  throw new Error("Browser Use task timed out");
}

export const findVendors = action({
  args: {
    questId: v.id("quests"),
    userId: v.id("users"),
    searchQuery: v.string(),
    companyContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = `
Search the web for vendors matching: "${args.searchQuery}"
${args.companyContext ? `Context about the buyer: ${args.companyContext}` : ""}

For each vendor found (aim for 3-5 vendors):
1. Find their company name, website URL, and location
2. Check if they have an inquiry/contact form
3. Extract contact email if visible

Return a JSON array like:
[
  {
    "companyName": "...",
    "website": "...",
    "location": "...",
    "hasContactForm": true/false,
    "contactFormUrl": "...",
    "contactEmail": "...",
    "description": "brief description of what they offer"
  }
]
Only return the JSON array, no other text.
    `.trim();

    const output = await runBrowserTask(task);
    let vendors: Array<{
      companyName: string;
      website?: string;
      location?: string;
      hasContactForm?: boolean;
      contactFormUrl?: string;
      contactEmail?: string;
      description?: string;
    }> = [];

    try {
      // Extract JSON from output
      const match = output.match(/\[[\s\S]*\]/);
      if (match) vendors = JSON.parse(match[0]);
    } catch {
      console.error("Failed to parse vendor list:", output);
    }

    return vendors;
  },
});

export const scrapeWebsite = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const task = `
Visit the website at ${args.url} and extract the following information:
- Company name
- What products or services they offer
- Their location / headquarters
- Any pricing information visible
- Contact email address(es)
- Whether they have an inquiry/contact/quote form and its URL
- Their apparent company size (small/medium/large based on website)

Return as JSON:
{
  "companyName": "...",
  "products": "...",
  "location": "...",
  "pricing": "...",
  "contactEmail": "...",
  "contactFormUrl": "...",
  "companySize": "small|medium|large"
}
    `.trim();

    const output = await runBrowserTask(task);
    try {
      const match = output.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {
      console.error("Failed to parse scrape result:", output);
    }
    return null;
  },
});

export const fillContactForm = action({
  args: {
    vendorId: v.id("vendors"),
    formUrl: v.string(),
    companyName: v.string(),
    productNeed: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const task = `
Go to ${args.formUrl} and fill out the inquiry/contact form with these details:
- Name / Company: ${args.companyName}
- Contact name: ${args.contactName}
- Email: ${args.contactEmail}
- Message: ${args.message}
- Product need: ${args.productNeed}

If there are fields like "product type", "quantity", "timeline", fill them with reasonable values from the context.
Submit the form when all fields are filled.

Return "success" if form was submitted, or "failed: <reason>" if it could not be submitted.
    `.trim();

    const output = await runBrowserTask(task);
    const success = output.toLowerCase().includes("success");

    // Update vendor in DB
    await ctx.runMutation(api.vendors.updateStage, {
      vendorId: args.vendorId,
      stage: "contacted",
      formSubmitted: true,
    });

    return { success, output };
  },
});
