# FORAGE — Product Spec

> AI made building software easy. Nobody's done the same for physical products — until now.
> Forage is Animal Crossing meets B2B: your AI agent forages the real world so you can build your product.

---

## 1. VISION

**The insight:** AI has made shipping digital products trivially easy. But creating real, physical products — food, beverages, consumer goods — is still a nightmare. Finding manufacturers, navigating FDA regulations, attending trade shows (박람회), getting certifications, reaching buyers, sending test samples... the entire journey from "I have a product idea" to "it's on shelves" is brutal. AI barely helps with any of it yet.

**Forage changes that.** Your AI agent handles the real-world legwork: finding vendors, contacting them, negotiating deals, tracking regulations, discovering trade shows and buyer opportunities. All inside a cozy, gamified village where each real company becomes an animal NPC.

**This is not a hackathon toy.** This is a full-stack AI company that automates the hardest part of building physical product businesses.

---

## 2. CORE CONCEPT

You're building a company. Your AI agent (a trusty assistant character) helps you find real-world vendors, contact them, negotiate deals, and track everything — all inside a cozy, gamified village. Each vendor becomes an animal NPC that walks around your village. Managing B2B deals feels like playing a game.

**Target user:** Anyone creating physical products — especially people sourcing manufacturers, suppliers, and packagers, or starting a new product/brand from scratch.

**Core value:** Reduce time spent on choosing and decision-making. The agent doesn't just find vendors — it helps you THINK, recommends options, and guides you through decisions.

**Full vision (beyond hackathon):**
- Vendor sourcing + outreach + negotiation (hackathon scope)
- Regulatory guidance (FDA, certifications, compliance)
- Trade show / 박람회 discovery and registration
- Buyer outreach (retail, wholesale, distributors)
- Product testing and qualification tracking
- Logistics and shipping coordination
- The entire physical product launch journey, gamified

---

## 2. USER FLOWS

### Flow A: Onboarding (First Visit)

**Step 1 — Character creation**
- Pick avatar (your character in the village)
- Name your village (= your company/brand identity)

**Step 2 — Company setup (combined approach)**
- Agent asks: "Do you have an existing business or starting something new?"

**If existing business:**
1. "What's your website?" → user pastes URL
2. Browser Use scrapes website → extracts: company name, product, location, industry, team size
3. Agent presents: "Here's what I found. Anything wrong?"
4. User corrects/confirms
5. Agent asks guided follow-ups for anything missing

**If new business:**
1. "Tell me about your product idea" → free text
2. Agent analyzes and breaks it down into a supply chain checklist:
   ```
   "To launch a kombucha brand you'll need:"
   ☐ Ingredients supplier (tea, SCOBY, sugar)
   ☐ Bottling / co-packer
   ☐ Label design + printing
   ☐ Packaging (boxes, shrink wrap)
   ☐ Distribution partner
   ```
3. User checks which ones they need help with
4. Each checked item becomes a Quest

**Step 3 — "What do you need right now?"**
- Guided choices (Claude Code-style) based on company type
- Each need becomes a Quest the agent will forage for

---

### Flow B: Village View (Main Hub)

The main screen. An isometric/top-down village.

**Layout:**
- Your HQ in the center
- NPC vendors walk around freely (idle animations, wandering)
- Empty plots that fill as more vendors are found
- Chat bar at bottom to talk to your agent
- Sidebar with NPC list (click name → camera pans to that NPC)
- Notification bell for agent alerts

**NPC behavior:**
- Each vendor is assigned a random animal character when discovered
- NPCs wander around the village with walk/idle animations
- Speech bubbles show latest status ("Got your quote!" / "Waiting for reply...")
- Click an NPC directly OR click their name in the sidebar → opens NPC detail
- When clicked from sidebar, camera smoothly pans to them

**Chat interface:**
- Bottom of screen, collapsible
- Natural language input
- Agent responds with text + clickable choice buttons (Claude Code-style)
- "Find me sticker vendors under $0.05/unit in China"
- Agent confirms understanding, starts foraging

---

### Flow C: Agent Foraging (Browser Use in Action)

When user requests a search:

1. Agent acknowledges: "On it! Foraging for sticker vendors..."
2. Browser Use runs in the background
3. Real-time updates in chat:
   - "Found StickerCo in Shenzhen — looks promising!"
   - "Found PrintMax in Guangzhou — good reviews"
   - "Found StickerLab in Dongguan — no inquiry form, skipping"
4. As each vendor is found, a new animal NPC appears in the village (with a little entrance animation)
5. Agent summarizes: "Found 3 vendors. Here's my take: [recommendations with reasoning]"

**What the agent does per vendor (automatic):**
1. Visits vendor website
2. Extracts: company name, products, pricing (if listed), location, contact info
3. Looks for inquiry/contact form on their website
4. **Form first:** Fills the inquiry form with user's company data + specific needs
5. **Email follow-up:** If email address found, sends follow-up via AgentMail
6. Creates dedicated AgentMail inbox thread for this vendor
7. Stores all data in Convex

---

### Flow D: NPC Detail View (Click on a Vendor)

Opens when you click on an NPC.

**Contains:**
- Animal avatar + company name + location
- NPC "personality" quote (generated from communication style)
- Deal status progress bar: Found → Contacted → Replied → Negotiating → Closed
- Key metrics: quote price, MOQ, lead time, response speed
- Conversation thread (email history displayed as chat bubbles between you and the NPC)
- Action buttons:
  - [Auto-negotiate ⚡] — AI drafts negotiation email
  - [Draft reply ✏️] — write/edit your own
  - [Send now] / [Review first] toggle
- Agent recommendation: "This vendor replied in 2 hours — that's fast. Their quote is 20% below average. I'd push for a lower MOQ."

---

### Flow E: Decision Tree (Workflow View)

A separate view accessible from the nav. Shows all Quests and their branching paths.

**Structure:**
```
[Quest: "Find sticker vendors"]
         /        |        \
    🦊           🐻         🐸
  StickerCo   PrintMax   StickerLab
     |            |           ✖ (no reply)
  Form sent    Form sent
     |            |
  Replied!     Replied!
     |            |
  $0.03/ea    $0.05/ea
     |            ✖ (too expensive)
  Negotiating
     |
  ⭐ Best option
```

**Features:**
- Each Quest is a tree rooted at the user's request
- Branches = individual vendors found
- Dead branches greyed out with reason (no reply, too expensive, rejected)
- Active branches highlighted
- AI recommendation highlighted with reasoning
- Click any node → jumps to that NPC's detail view
- "Keep Looking" button → agent continues foraging for more vendors
- Compare mode: side-by-side comparison of active vendors

---

### Flow F: Auto-Negotiation

Triggered from NPC detail view.

1. User clicks [Auto-negotiate ⚡]
2. Agent drafts email based on:
   - User's company context
   - Vendor's quote and terms
   - What other vendors quoted (leverage)
   - Negotiation best practices
3. Shows draft with options:
   - [Send now ⚡] — send immediately
   - [Edit first ✏️] — modify before sending
   - [Cancel ❌]
4. "Important contact" toggle: if ON, always shows draft first (never auto-sends)

---

### Flow G: Decision-Helping UX (Everywhere)

The agent proactively helps users make decisions. This appears in 4 places:

**1. In chat (primary)**
- Agent asks questions with clickable choices
- "I found 5 vendors. Want me to prioritize by: [Price] [Speed] [Reviews] [Location]?"
- "StickerCo offered $0.03. Should I: [Accept] [Counter at $0.025] [Ask for samples first]?"

**2. On the decision tree**
- Recommended path is highlighted/glowing
- Tooltip: "StickerCo is 40% cheaper with 2x faster delivery than others"
- Dead branches have clear reason labels

**3. In NPC interactions**
- Agent annotation on each vendor: "Fast responder. Quote is below market average. Recommend."
- Or: "Slow to reply. Quote is 30% above others. Consider alternatives."

**4. Push notifications / toasts**
- "3 vendors replied! StickerCo's quote is best. Want me to negotiate?"
- "PrintMax hasn't replied in 48h. Should I follow up or drop them?"
- "New vendor found! FoamBox offers 15% below your current best quote."

---

## 3. TECH ARCHITECTURE

```
[Next.js on Vercel]  ←→  [Convex Backend]
     │                        │
     ├── Village UI            ├── Users / companies
     │   (Canvas/PixiJS        ├── Vendors (NPCs)
     │    + sprite animation)  ├── Quests
     │                         ├── Messages / emails
     ├── Chat interface        ├── Workflow state
     ├── Decision tree view    │
     ├── NPC detail view       ├── Tool: Browser Use API
     └── Responsive / mobile   │     (find vendors, fill forms)
                               ├── Tool: AgentMail
                               │     (send/receive emails)
                               ├── Tool: Claude API
                               │     (reasoning, negotiation drafts)
                               └── Webhooks ← AgentMail replies
```

**Stack:**
| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Next.js + Vercel + v0 | Fast deploy, v0 for UI components |
| Village rendering | PixiJS or HTML Canvas | Sprite animation, NPC movement, lightweight |
| Backend / DB | Convex | Real-time sync, reactive queries, zero setup |
| Web agent | Browser Use API v3 | Find vendors, scrape info, fill forms |
| Email | AgentMail | Per-vendor inboxes, send/receive, webhooks |
| LLM | Claude (Anthropic) | Reasoning, negotiation drafts, decisions |
| Character assets | Meshy / Tripo3D → PNG sprites | AI-generated 3D animal characters |
| Hosting | Vercel | Free, fast, auto-deploy |

---

## 4. DATA MODEL (Convex)

```
Users
  - id
  - name, avatar
  - companyName, companyDescription
  - website (optional)
  - extractedCompanyData (from scraping)
  - needs[] (what they're looking for)
  - isNewBusiness: boolean

Quests
  - id
  - userId
  - description ("Find sticker vendors in Shenzhen")
  - status: active | completed | paused
  - createdAt

Vendors (NPCs)
  - id
  - questId
  - companyName, website, location
  - animalType (fox, raccoon, bear, frog, etc.)
  - characterName (auto-generated)
  - contactEmail (if found)
  - formSubmitted: boolean
  - emailSent: boolean
  - agentmailInboxId
  - stage: discovered | contacted | replied | negotiating | closed | dead
  - deadReason (optional: "no reply", "too expensive", "rejected")
  - quote: { price, moq, leadTime }
  - agentNotes (AI assessment of this vendor)
  - position: { x, y } (village position)

Messages
  - id
  - vendorId
  - direction: inbound | outbound
  - content
  - type: form_submission | email | auto_negotiation
  - isDraft: boolean
  - sentAt

WorkflowNodes (for decision tree)
  - id
  - questId
  - vendorId
  - parentNodeId
  - stage
  - label
  - isRecommended: boolean
  - reason (AI explanation)
```

---

## 5. OUTREACH LOGIC (Per Vendor)

Priority order: **Form first → Email follow-up**

```
For each vendor found:
  1. Visit vendor website via Browser Use
  2. Extract company info, products, pricing
  3. Look for inquiry/contact form
  4. IF form found:
     a. Fill form with user's company data + specific needs
     b. Submit form
     c. Log as "form_submission" in Messages
  5. Search for direct email address (contact page, LinkedIn, etc.)
  6. IF email found:
     a. Create AgentMail inbox thread for this vendor
     b. Send follow-up email: "Hi, we also submitted an inquiry form.
        We're [company] looking for [need]. Would love to connect."
     c. Log as "email" in Messages
  7. IF neither form nor email found:
     a. Mark vendor as "contacted" with note: "No contact method found"
     b. Agent suggests: "Should I look for their LinkedIn or phone instead?"
  8. Set vendor stage to "contacted"
  9. Wait for replies (AgentMail webhook for emails)
```

---

## 6. BUILD PRIORITY (26 Hours / 2 People)

### MUST BUILD (Core Demo) — ~20h

| Feature | Hours | Owner |
|---------|-------|-------|
| Convex schema + API | 3h | Person A |
| Browser Use integration (find vendors + fill forms) | 5h | Person A |
| AgentMail integration (send/receive) | 3h | Person A |
| Village UI with animated NPC sprites | 5h | Person B |
| Character assets (Meshy/Tripo3D → sprites) | 2h | Person B |
| Chat interface (Claude Code-style choices) | 3h | Person B |
| NPC detail view + email thread | 2h | Person B |
| Decision tree view | 3h | Split |
| Smart onboarding (website scrape + guided questions) | 2h | Split |
| Claude integration (negotiation drafts, decisions) | 2h | Person A |

### SHOULD BUILD (If Time) — ~4h

| Feature | Hours |
|---------|-------|
| Auto-negotiation with draft review | 2h |
| Push notification toasts | 1h |
| Mobile responsive layout | 1h |

### MENTION IN PITCH ONLY (Don't Build)

- Level-up / unlock system
- Invoice tracking + payment alerts
- Ontology / backlink tagging (Obsidian-style)
- Calendar / meeting scheduling
- Supermemory long-term context
- Multi-user / team collaboration
- PWA / native mobile app

---

## 7. DEMO SCRIPT (3 Minutes)

**0:00–0:15 — The hook**
"Every small business owner wastes 20+ hours finding vendors, emailing back and forth, comparing quotes. What if it felt like this instead?"
→ Show the village. NPCs walking around. Cozy music.

**0:15–0:30 — Onboarding**
"I want to start a kombucha brand."
→ Agent breaks it down: ingredients, bottling, labels, packaging.
→ "Let me start foraging."

**0:30–1:30 — The wow moment**
Agent forages live. Browser Use finds 3 bottling companies.
→ Animal NPCs pop into the village one by one.
→ "Found BottleCo in Portland! They do kombucha runs."
→ Agent fills their inquiry form AND sends email.

**1:30–2:15 — Interaction**
Click on the raccoon NPC (BottleCo).
→ See their profile, quote, email thread.
→ Hit "Auto-negotiate" → AI drafts email using competitor quotes as leverage.
→ "Send it."

**2:15–2:45 — Decision tree**
Switch to workflow view.
→ Branching tree: 3 vendors, one rejected, one too expensive, one recommended.
→ Agent: "BottleCo is your best option — 30% cheaper, fastest reply."

**2:45–3:00 — Vision**
"This is Forage. Your village grows as your business grows. Every NPC is a real vendor. Every deal is a quest. B2B sourcing shouldn't feel like work — it should feel like building something."

---

## 8. NAME

**FORAGE** — Your agent forages the internet for vendors. Cozy, nature-themed, matches the Animal Crossing aesthetic. "Forage found 3 bottling companies near Portland."

(Open to alternatives — can revisit.)
