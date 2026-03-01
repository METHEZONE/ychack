<div align="center">

# 🌿 Forage

### AI made building software easy. Nobody's done the same for physical products — until now.

**Forage is a gamified B2B sourcing agent that turns the pain of finding manufacturers into an Animal Crossing-style village experience.**

Your AI agent forages the web for real vendors, fills their inquiry forms, sends emails, negotiates deals — and each vendor becomes a walking animal NPC in your cozy village.

[Demo Video](#demo) · [How It Works](#how-it-works) · [Architecture](#architecture) · [Tech Stack](#tech-stack)

</div>

---

## The Problem

Creating a physical product in 2026 is still brutal.

You have an idea for a product — maybe a sustainable candle line, a new snack brand, or custom packaging for your startup. What happens next?

- **20+ hours** searching for manufacturers across Google, Alibaba, trade directories
- **Dozens of emails** sent into the void with no replies
- **Inquiry forms** filled out one by one, each asking for the same information
- **No easy way to compare** quotes, MOQs, and lead times side by side
- **Decision fatigue** — you're a founder, not a supply chain expert

AI has made shipping digital products trivially easy. Cursor, v0, Claude Code — you can build an app in a weekend. But sourcing the real, physical things that make up your product? That's still 2015.

**Forage changes this.**

---

## The Solution

Forage is an AI sourcing agent disguised as a cozy game.

Tell your agent what you're looking for — *"cotton fabric suppliers in Vietnam"* — and it forages the web for you. It finds real vendors, scrapes their websites, fills out their inquiry forms with your company data, and sends personalized follow-up emails. All automatically.

But here's the twist: **every vendor it finds becomes an animal NPC that moves into your village.**

🦊 Rex from SunFab Textiles walks around your village. Click him, and he tells you about their quote — $2.40/meter, 500 meter MOQ, 3-4 week lead time. Want to negotiate? Your AI agent drafts a negotiation email using competitor quotes as leverage. One click to send.

🐻 Bruno from Mumbai Cotton Mills just replied with a lower price. His speech bubble says "Here's my quote!" Walk over and compare deals.

🐰 Clover from EcoThread hasn't responded yet. She's standing still with "..." above her head. Your agent can send a follow-up, or you can move on.

**B2B sourcing has never felt like this.**

---

## How It Works

### 1. Tell Forage what you need

Type a natural language query — as specific or vague as you want:

> *"Find me sustainable packaging suppliers in Europe"*
> *"Cotton fabric manufacturers, low MOQ, fast shipping"*
> *"I want to make a hot sauce brand — what do I need?"*

For new businesses, Forage's AI breaks down your product idea into a supply chain checklist automatically.

### 2. Your agent forages the web

Forage dispatches AI agents to scour the internet:

- **Tavily Search** finds relevant vendor websites in seconds
- **Browser Use** visits each site, extracts company info, and fills inquiry forms with your details
- **AgentMail** creates a dedicated email inbox per vendor and sends personalized follow-ups
- **Claude** analyzes each vendor and recommends the best fits

All of this happens in real-time. You watch vendors pop into your village one by one.

### 3. Vendors become NPCs in your village

Each vendor gets assigned a unique animal character — a fox, a bear, a rabbit — with a name, personality, and speech bubbles that reflect their deal status:

| Stage | What the NPC says | What it means |
|-------|-------------------|---------------|
| 🔵 Discovered | *"Nice to meet you!"* | Agent found them, hasn't reached out yet |
| 🔷 Contacted | *"Got your message!"* | Form filled and/or email sent |
| 🟢 Replied | *"Here's my quote!"* | Vendor responded with pricing |
| 🟡 Negotiating | *"Let's make a deal!"* | Back-and-forth on terms |
| ⭐ Closed | *"Deal done!"* | You've accepted their offer |
| ⚫ Dead | *"..."* | No response or rejected |

NPCs wander around your village, idle and walk with smooth animations, and react to your presence. Walk near one and press **E** to talk.

### 4. Negotiate and decide with AI help

When you click a vendor NPC, Forage gives you **Claude Code-style choices** — not open-ended menus, but smart options based on context:

- **[⚡ Auto-negotiate]** → Claude drafts a negotiation email using competitor quotes as leverage
- **[✅ Accept this deal]** → Close the deal
- **[📋 View full profile →]** → See email thread, metrics, AI assessment

The AI doesn't just find vendors — it helps you **think through decisions**. It compares quotes, flags red flags, and recommends the strongest fit.

### 5. Track everything in a decision tree

Every quest has a visual decision tree showing all vendor branches:

```
🌿 "Find cotton fabric suppliers"
├── 🦊 SunFab Textiles [$2.40/m, 500m MOQ] ⭐ Recommended
├── 🐻 Mumbai Cotton [$1.95/m, 1000m MOQ] — Negotiating MOQ
├── 🐰 EcoThread Vietnam — Waiting for reply
└── 🦌 Nordic Linen — Not contacted yet
```

Green paths are recommended. Grey paths are dead ends with reasons. Click any node to jump to that vendor.

---

## Why This Matters

### For founders creating physical products

The gap between "I have a product idea" and "I have a manufacturer" is where most physical product startups die. Not because the idea was bad — because the sourcing process is so painful that people give up.

Forage compresses weeks of manual work into minutes of delightful interaction.

### For the future of AI agents

Most AI agents today are invisible — they run in the background and return results in a text box. Forage proves that **AI agents can have personality, presence, and a sense of place.** When your fox NPC walks over with a new quote, it *feels* different than getting a notification. It feels like progress. It feels like building something.

### The full vision

Vendor sourcing is just the beginning. The full Forage vision covers the **entire physical product launch journey**:

- 🏭 **Vendor sourcing & outreach** ← *hackathon scope*
- 📋 **FDA & regulatory compliance** — AI navigates certification requirements
- 🎪 **Trade show intelligence** — Find relevant events, prep booth materials
- 🧪 **Product testing coordination** — Connect with testing labs
- 📦 **Logistics & fulfillment** — Shipping, warehousing, 3PL matching
- 🛒 **Buyer outreach** — Help get your product on shelves

Every step of the journey, a new type of NPC moves into your village. Your village grows as your product grows.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Village   │  │ Chat     │  │ Decision Tree     │  │
│  │ Canvas    │  │ Interface│  │ + Vendor Detail    │  │
│  │ (60fps)   │  │          │  │                   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │              │
│       └──────────────┼─────────────────┘              │
│                      │                                │
│              Convex React Hooks                       │
│           (useQuery · useMutation · useAction)        │
└──────────────────────┬────────────────────────────────┘
                       │ Real-time sync
┌──────────────────────┴────────────────────────────────┐
│                    CONVEX BACKEND                      │
│                                                        │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Database │  │ Mutations│  │ Actions (AI Agents)  │  │
│  │         │  │ & Queries│  │                      │  │
│  │ users    │  │          │  │  forage.ts ─────────┼──┼──→ Tavily (search)
│  │ vendors  │  │          │  │    │                 │  │
│  │ quests   │  │          │  │    ├── browserUse ──┼──┼──→ Browser Use (forms)
│  │ messages │  │          │  │    ├── agentmail ───┼──┼──→ AgentMail (email)
│  │ chat     │  │          │  │    └── claude ──────┼──┼──→ Claude (reasoning)
│  │ workflow │  │          │  │                      │  │
│  └─────────┘  └──────────┘  └──────────────────────┘  │
│                                                        │
│  ┌─────────────────────────┐                           │
│  │ HTTP Router (Webhooks)  │ ← AgentMail replies       │
│  └─────────────────────────┘                           │
└────────────────────────────────────────────────────────┘
```

**The agent pipeline:**

1. User types search query → `forageForVendors` action kicks off
2. **Tavily** searches the web for matching vendors (~2-3 seconds)
3. For each vendor found:
   - Create NPC record in database (triggers real-time UI update → NPC appears in village)
   - **Browser Use** fills their inquiry/contact form
   - **AgentMail** creates a dedicated inbox and sends follow-up email
   - Chat updates stream in real-time: *"Found SunFab Textiles in Guangzhou!"*
4. When a vendor replies → AgentMail webhook → vendor stage updates → NPC speech bubble changes

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16 + React 19 | Server components, edge rendering, fast |
| **Styling** | Tailwind CSS 4 + Framer Motion | Beautiful animations, rapid iteration |
| **Game Engine** | HTML/CSS + Framer Motion | Smooth NPC movement, 60fps game loop |
| **State** | Zustand | Lightweight, real-time UI state |
| **Backend** | Convex | Real-time database, TypeScript-first, reactive queries |
| **Web Agent** | Browser Use API v3 | Autonomous web browsing — finds vendors, fills forms |
| **Search** | Tavily API | Fast web research for vendor discovery |
| **Email** | AgentMail | Per-vendor inboxes, send/receive, webhook-driven |
| **AI** | Claude Sonnet 4.6 | Vendor analysis, negotiation drafting, product breakdown |
| **Hosting** | Vercel | Zero-config deployment |

---

## Why We Built This

We're two generalists who believe the next wave of AI isn't just about code generation — it's about **automating the messy, real-world processes** that founders face every day.

We've watched friends try to launch physical products and hit the same wall: the sourcing process is fragmented, manual, and soul-crushing. Meanwhile, AI agents can browse the web, send emails, and reason about complex decisions. The pieces were all there. Nobody had put them together.

So we built Forage in 26 hours at YC HQ.

We didn't want to build another dashboard. We wanted to build something that makes the hard thing feel **easy, fun, and human.** That's why it's a village. That's why vendors are animals. That's why every interaction feels like playing a game instead of doing procurement.

**Because if AI can make building software feel like magic, it should do the same for building real things.**

---

## Running Locally

```bash
# Clone and install
git clone <repo-url>
cd forage
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys:
# - ANTHROPIC_API_KEY
# - BROWSER_USE_API_KEY
# - AGENTMAIL_API_KEY
# - TAVILY_API_KEY

# Start Convex backend (in one terminal)
npx convex dev

# Start Next.js frontend (in another terminal)
npm run dev

# Open http://localhost:3000
```

---

## Project Structure

```
forage/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── page.tsx            # Onboarding (avatar, company setup)
│   │   ├── village/page.tsx    # Main village game
│   │   ├── tree/page.tsx       # Decision tree view
│   │   └── vendor/[id]/        # Vendor detail page
│   ├── components/
│   │   ├── village/            # VillageCanvas, NPC, GameHUD, ForageSearch, NPCDialogue
│   │   ├── vendor/             # VendorDetail, EmailThread, DealProgress
│   │   ├── tree/               # DecisionTree, TreeNode
│   │   ├── chat/               # ChatBar, ChatMessage, ChoiceButtons
│   │   └── onboarding/         # OnboardingFlow, CompanySetup, NeedsSelector
│   └── lib/
│       ├── store.ts            # Zustand global state
│       ├── animals.ts          # 10 animal types, names, colors
│       ├── constants.ts        # Stages, colors, village layout
│       └── sounds.ts           # Procedural audio (Web Audio API)
├── convex/
│   ├── schema.ts               # Database schema
│   ├── actions/
│   │   ├── forage.ts           # Main agent orchestrator
│   │   ├── claude.ts           # LLM reasoning & drafting
│   │   ├── browserUse.ts       # Web automation (Browser Use v3)
│   │   ├── agentmail.ts        # Email send/receive
│   │   └── tavily.ts           # Web search
│   ├── vendors.ts              # Vendor CRUD & queries
│   ├── users.ts, quests.ts     # Core data operations
│   ├── http.ts                 # Webhook endpoints
│   └── demo.ts                 # Demo data seeding
└── public/                     # Static assets
```

---

## The Team

Built in 26 hours by two generalists at the **Browser Use Web Agents Hackathon @ YC HQ** (Feb 28 – Mar 1, 2026).

We believe AI agents should feel alive, not invisible. Forage is our proof that the most complex real-world workflows can be made delightful.

---

<div align="center">

*Find vendors. Build your product. Grow your village.* 🌿

</div>
