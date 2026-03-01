/**
 * Forage — Email Workflow Test
 *
 * Tests:
 *   1. Browser Use: scrape intelligentblends.com + fill inquiry form
 *   2. AgentMail: create per-vendor inbox + send follow-up email
 *
 * Run: node test-workflow.mjs
 */

import fs from "fs";

// Load .env and .env.local
for (const file of [".env", ".env.local"]) {
  try {
    const env = fs.readFileSync(file, "utf-8");
    for (const line of env.split("\n")) {
      const [k, ...v] = line.split("=");
      if (k && !k.startsWith("#") && v.length) process.env[k.trim()] = v.join("=").trim();
    }
  } catch {}
}

const BROWSER_USE_KEY = process.env.BROWSER_USE_API_KEY;
const AGENTMAIL_KEY = process.env.AGENTMAIL_API_KEY;

// ─── Fake user profile (replace with real onboarding data later) ───────────
const USER = {
  name: "Alex Park",
  businessName: "Brew Co",
  phone: "+1-555-0100",
  description: "We are launching a specialty coffee brand and looking for an OEM partner for bagged coffee. Interested in pricing, MOQ, and lead times.",
  productInterest: "Bag Coffee",
  budget: "$10,000 - $50,000",
};

// ─── 1. Browser Use: Scrape + Fill Form ───────────────────────────────────
async function runBrowserUseTask(inboxEmail) {
  console.log("\n🤖 [Browser Use] Starting task...");

  const contactEmail = inboxEmail ?? "test-forage@example.com";

  const task = `
You are a B2B sourcing agent for a company called "${USER.businessName}".

Go to https://www.intelligentblends.com and do the following:

STEP 1 — Scrape company information:
Collect: company name, what products they offer (K-cup, bag coffee, stick packs, pouches),
minimum order quantity if mentioned, location, and any pricing information visible.

STEP 2 — Find and fill the inquiry form:
Look for a contact or "Get Started" form on the page. Fill it with:
- Contact Name: ${USER.name}
- Business Name: ${USER.businessName}
- Contact Email: ${contactEmail}
- Contact Phone: ${USER.phone}
- Product type: check "Bag Coffee"
- "I Am Currently": select "Starting a new brand" or closest option
- Project Budget: select "${USER.budget}" or closest option
- Message: "${USER.description}"

STEP 3 — Submit the form.

Return a JSON object with:
{
  "companyInfo": {
    "name": "...",
    "products": ["..."],
    "location": "...",
    "moq": "...",
    "contactEmail": "...",
    "notes": "..."
  },
  "formFound": true/false,
  "formSubmitted": true/false,
  "formUrl": "..."
}
`;

  // Create session
  const createRes = await fetch("https://api.browser-use.com/api/v3/sessions", {
    method: "POST",
    headers: {
      "X-Browser-Use-API-Key": BROWSER_USE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task,
      model: "bu-mini",   // cheapest model for testing
      max_cost_usd: 0.50,
    }),
  });

  const session = await createRes.json();
  console.log(`   Session ID: ${session.id}`);
  console.log(`   Live view:  ${session.liveUrl ?? "not available"}`);

  // Poll until done
  let result = null;
  let attempts = 0;
  const maxAttempts = 60; // 5 min max

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000));
    attempts++;

    const pollRes = await fetch(
      `https://api.browser-use.com/api/v3/sessions/${session.id}`,
      { headers: { "X-Browser-Use-API-Key": BROWSER_USE_KEY } }
    );
    const status = await pollRes.json();

    process.stdout.write(`   [${attempts * 5}s] status: ${status.status}\r`);

    if (["finished", "idle", "stopped", "completed"].includes(status.status)) {
      result = status;
      break;
    }
    if (["failed", "timed_out"].includes(status.status)) {
      console.log(`\n   ❌ Session ${status.status}`);
      result = status;
      break;
    }
  }

  console.log("\n");
  return result;
}

// ─── 2. AgentMail: Create inbox + send follow-up ──────────────────────────
async function runAgentMailTest() {
  if (!AGENTMAIL_KEY) {
    console.log("⚠️  [AgentMail] No AGENTMAIL_API_KEY found — skipping.");
    console.log("   Get key → https://app.agentmail.to + sign up via hackathon form");
    return null;
  }

  console.log("\n📧 [AgentMail] Creating per-vendor inbox...");

  const { AgentMailClient } = await import("agentmail");
  const mail = new AgentMailClient({ apiKey: AGENTMAIL_KEY });

  // Create a dedicated inbox for this vendor
  const inbox = await mail.inboxes.create({
    username: `forage-intelligentblends-test`,
    displayName: "Forage Agent",
  });

  console.log(`   Inbox created: ${inbox.address}`);

  // Send follow-up email
  await mail.messages.send(inbox.inboxId, {
    to: [inbox.address], // send to self for test (replace with vendor email in prod)
    subject: `Partnership Inquiry — ${USER.businessName}`,
    text: `Hi Intelligent Blends team,

We recently submitted an inquiry via your website. I wanted to follow up directly as well.

We are ${USER.businessName}, currently ${USER.description}

We're specifically interested in your Bag Coffee OEM capabilities. Could you share:
- Minimum order quantities
- Lead times
- Pricing structure

Looking forward to hearing from you.

Best,
${USER.name}
${USER.businessName}`,
  });

  console.log(`   ✅ Follow-up email sent from ${inbox.address}`);
  return inbox;
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Forage — Email Workflow Test       ║");
  console.log("║   Vendor: Intelligent Blends         ║");
  console.log("╚══════════════════════════════════════╝");

  // Step 1: Create AgentMail inbox first (so we can use its address in the form)
  const inbox = await runAgentMailTest();
  const inboxEmail = inbox?.address ?? null;

  // Step 2: Browser Use — scrape + fill form using inbox email
  const browserResult = await runBrowserUseTask(inboxEmail);

  // ─── Results ──────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log("RESULTS:");
  console.log("═══════════════════════════════════════");

  if (browserResult) {
    console.log(`\n🌐 Browser Use:`);
    console.log(`   Status:  ${browserResult.status}`);
    console.log(`   Cost:    $${browserResult.totalCostUsd ?? "?"}`);
    console.log(`   Output:\n`);
    console.log(browserResult.output ?? "(no output)");
  }

  if (inbox) {
    console.log(`\n📧 AgentMail:`);
    console.log(`   Inbox:   ${inbox.address}`);
    console.log(`   Watch for vendor replies at: https://app.agentmail.to`);
  }

  console.log("\n✅ Test complete.");
}

main().catch(console.error);
