"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// ─── Smart Form Submission Orchestrator ─────────────────────────────────────────
// 1. Gather context (vendor, user, chat history, quest)
// 2. Claude composes a personalized form message
// 3. Schedule Browser Use to find + fill + submit the form (fire-and-forget)
// 4. Notify user via chat that submission is in progress
export const smartFormSubmission = action({
  args: {
    vendorId: v.id("vendors"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // ── 1. Gather context ──────────────────────────────────────────────────────
    const vendor = await ctx.runQuery(api.vendors.get, { vendorId: args.vendorId });
    if (!vendor) throw new Error("Vendor not found");
    if (!vendor.website) throw new Error("Vendor has no website");
    if (vendor.formSubmitted) throw new Error("Form already submitted for this vendor");

    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    if (!user) throw new Error("User not found");

    // Pre-flight data quality check
    const missingData: string[] = [];
    if (!user.companyName) missingData.push("company name");
    if (!user.email) missingData.push("email");
    if (!user.companyDescription) missingData.push("business description");

    if (missingData.length > 0) {
      // Notify user that profile data is needed
      await ctx.runMutation(api.chatMessages.create, {
        userId: args.userId,
        role: "agent",
        content: `🐻 Before I can submit forms on your behalf, I need a few details: **${missingData.join(", ")}**. Talk to Gomi in the village to fill in your profile!`,
        choices: ["🐻 Talk to Gomi"],
        metadata: { action: "profile_incomplete", missingFields: missingData },
      });
      throw new Error(`Profile incomplete: missing ${missingData.join(", ")}`);
    }

    const contactName = user.name ?? "Founder";
    const companyName = user.companyName!;
    const companyDescription = user.companyDescription ?? "";
    const userEmail = user.email ?? null;

    const quest = await ctx.runQuery(api.quests.get, { questId: vendor.questId });
    const productNeed = quest?.description ?? "sourcing inquiry";

    // Get recent chat history for personalization
    const recentChat = await ctx.runQuery(api.chatMessages.listByUserRecent, {
      userId: args.userId,
      limit: 10,
    });
    const chatHistory = recentChat.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "agent",
      content: m.content,
    }));

    // ── 2. Claude composes personalized message ──────────────────────────────
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `📋 Preparing contact form submission for **${vendor.companyName}**... Composing a personalized message now.`,
      metadata: { action: "form_preparing", vendorId: args.vendorId },
    });

    let formMessage: string;
    try {
      formMessage = await ctx.runAction(api.actions.claude.composeFormMessage, {
        vendorName: vendor.companyName,
        vendorWebsite: vendor.website,
        userCompanyName: companyName,
        userContactName: contactName,
        userCompanyDescription: companyDescription || undefined,
        productNeed,
        productionScale: user.productionScale || undefined,
        timeline: user.timeline || undefined,
        geoPreference: user.geoPreference || undefined,
        chatHistory,
      });
    } catch {
      formMessage = `Hi,\n\nWe came across ${vendor.companyName} and are interested in sourcing ${productNeed} for our brand.\n\nCould you share your pricing, minimum order quantity, and lead times? We're currently evaluating suppliers and ${vendor.companyName} looks like a strong fit.\n\nLooking forward to hearing from you!\n\nBest,\n${contactName}\n${companyName}`;
    }

    // ── 3. Get or ensure inbox for reply tracking ──────────────────────────────
    let inboxEmail = vendor.agentmailInboxId;
    if (!inboxEmail) {
      try {
        const inbox = await ctx.runAction(api.actions.agentmail.createVendorInbox, {
          vendorId: args.vendorId,
          vendorName: vendor.companyName,
          category: vendor.category ?? undefined,
        }) as { inboxId: string };
        inboxEmail = inbox.inboxId;
      } catch {
        inboxEmail = "zone@agentmail.to";
      }
    }

    // ── 4. Schedule Browser Use form fill (fire-and-forget) ──────────────────
    await ctx.scheduler.runAfter(0, api.actions.browserUse.smartFillContactForm, {
      vendorId: args.vendorId,
      vendorWebsite: vendor.website,
      companyName,
      contactName,
      contactEmail: inboxEmail,
      productNeed,
      message: formMessage,
      userId: args.userId,
      userEmail: userEmail ?? undefined,
      category: vendor.category ?? undefined,
    });

    // ── 5. Notify user that it's in progress ──────────────────────────────────
    await ctx.runMutation(api.chatMessages.create, {
      userId: args.userId,
      role: "agent",
      content: `🌐 Browser agent is now visiting **${vendor.companyName}**'s website to find and fill their contact form. This may take 2-3 minutes — I'll let you know when it's done!`,
      metadata: { action: "form_in_progress", vendorId: args.vendorId },
    });

    return { scheduled: true, message: formMessage };
  },
});

// ─── Direct HTML fetch + regex email extraction (no API key needed, <1s) ─────
// Scrapes the page HTML and pulls email addresses with a regex.
// Also tries /contact and /about pages.
async function scrapeEmailsDirect(baseUrl: string): Promise<string[]> {
  const urls = [
    baseUrl.replace(/\/+$/, ""),
    `${baseUrl.replace(/\/+$/, "")}/contact`,
    `${baseUrl.replace(/\/+$/, "")}/contact-us`,
    `${baseUrl.replace(/\/+$/, "")}/about`,
  ];

  const emails = new Set<string>();
  // Match email patterns in HTML (text, mailto:, etc.)
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  // Skip these common false-positive emails
  const skipPatterns = /^(wixpress|sentry|cloudflare|webpack|example|test|noreply|no-reply|placeholder)/i;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ForageBot/1.0)" },
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const matches = html.match(emailRegex) ?? [];
      for (const m of matches) {
        const lower = m.toLowerCase();
        if (!skipPatterns.test(lower) && !lower.endsWith(".png") && !lower.endsWith(".jpg")) {
          emails.add(lower);
        }
      }
    } catch {
      // Page doesn't exist or timed out — skip
    }
  }

  return [...emails];
}

// Pick the best email: prefer sales/contact/info over generic ones
function pickBestEmail(emails: string[]): string | null {
  if (emails.length === 0) return null;
  const priority = ["sales", "contact", "info", "inquir", "hello", "business", "support"];
  for (const prefix of priority) {
    const match = emails.find((e) => e.startsWith(prefix));
    if (match) return match;
  }
  return emails[0];
}

// ─── Extract vendor contact email ───────────────────────────────────────────
// 1. Direct fetch + regex (<1s, free, catches visible emails like footer)
// 2. Tavily + Claude (~2s, better at structured extraction)
// 3. Browser Use fallback (~30s-1min, navigates JS-heavy sites)
export const findVendorEmail = action({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args): Promise<{ email: string | null; alreadyHad: boolean; source: string }> => {
    const vendor = await ctx.runQuery(api.vendors.get, { vendorId: args.vendorId });
    if (!vendor) throw new Error("Vendor not found");
    if (vendor.contactEmail) return { email: vendor.contactEmail as string, alreadyHad: true, source: "saved" };
    if (!vendor.website) throw new Error("Vendor has no website");

    const saveEmail = async (email: string) => {
      await ctx.runMutation(api.vendors.updateStage, {
        vendorId: args.vendorId,
        stage: vendor.stage as "discovered" | "contacted" | "replied" | "negotiating" | "closed" | "dead",
        contactEmail: email,
      });
    };

    // Attempt 1: Direct HTML scrape + regex (<1s, free)
    try {
      const emails = await scrapeEmailsDirect(vendor.website as string);
      const best = pickBestEmail(emails);
      if (best) {
        await saveEmail(best);
        return { email: best, alreadyHad: false, source: "direct" };
      }
    } catch (e) {
      console.warn("Direct email scrape failed:", e);
    }

    // Attempt 2: Tavily + Claude (~2s)
    try {
      const result: { email: string | null } | null = await ctx.runAction(
        api.actions.claude.scrapeAndAnalyzeWebsite,
        { url: vendor.website as string }
      );
      if (result?.email) {
        await saveEmail(result.email);
        return { email: result.email, alreadyHad: false, source: "tavily" };
      }
    } catch (e) {
      console.warn("Tavily email lookup failed:", e);
    }

    // Attempt 3: Browser Use (~30s-1min, navigates JS-heavy sites)
    try {
      const buResult = await ctx.runAction(api.actions.browserUse.findContactEmail, {
        vendorId: args.vendorId,
        vendorWebsite: vendor.website as string,
      }) as { email: string | null };
      if (buResult?.email) {
        return { email: buResult.email, alreadyHad: false, source: "browser_use" };
      }
    } catch (e) {
      console.warn("Browser Use email lookup also failed:", e);
    }

    return { email: null, alreadyHad: false, source: "not_found" };
  },
});
