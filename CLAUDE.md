# FORAGE

> AI made building software easy. Nobody's done the same for physical products — until now.

## What is this?

Forage is a gamified B2B sourcing agent for people creating physical products. Your AI agent forages the web for real vendors who become animal NPCs in an Animal Crossing-style village. You chat with your agent, it finds manufacturers, fills their inquiry forms, sends emails, negotiates deals, and tracks everything in a decision tree.

**Hackathon:** Browser Use Web Agents Hackathon @ YC HQ (Feb 28 – Mar 1, 2026)
**Team:** 2 people (generalists)
**Submission deadline:** Mar 1, 10:00 AM PST

## Vision

AI has made shipping digital products trivially easy. But creating real, physical products is still brutal — finding vendors, FDA regulations, trade shows, certifications, buyer outreach, product testing. Forage is the AI agent that handles all of this. The hackathon scope is vendor sourcing + outreach + negotiation. The full vision covers the entire physical product launch journey.

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js + Vercel + v0 |
| Village rendering | PixiJS (sprite animation, NPC movement) |
| Backend / DB | Convex (real-time sync, reactive queries) |
| Web agent | Browser Use API v3 (find vendors, fill forms) |
| Email | AgentMail (per-vendor inboxes, webhooks) |
| LLM | Claude / Anthropic (reasoning, negotiation, decisions) |
| Character assets | Meshy / Tripo3D → PNG sprite sheets |
| Hosting | Vercel |

## Key Files

- `PRODUCT_SPEC.md` — Full product spec (all flows, data model, architecture, demo script)
- `HACKATHON_RESEARCH.md` — Hackathon details, judges, prizes, sponsor credits, code recipes

## Architecture

```
[Next.js on Vercel]  ←→  [Convex Backend]
     │                        │
     ├── Village UI (PixiJS)   ├── Users / companies
     ├── Chat interface        ├── Vendors (NPCs)
     ├── NPC detail view       ├── Quests
     ├── Decision tree view    ├── Messages / emails
     └── Responsive / mobile   ├── Workflow state
                               │
                               ├── Browser Use API (find + fill forms)
                               ├── AgentMail (send/receive emails)
                               ├── Claude API (reasoning, drafts)
                               └── Webhooks ← AgentMail replies
```

## Outreach Logic

**Form first → Email follow-up (double touch)**
1. Find vendor website via Browser Use
2. Find and fill inquiry/contact form with user's company data
3. Find direct email address
4. Send follow-up email via AgentMail
5. Track both channels under one NPC

## Design Principles

- **Gamification is core identity, not decoration.** The Animal Crossing aesthetic IS the product differentiator.
- **Decision-helping UX everywhere.** Like Claude Code — give users choices, help them think, reduce decision fatigue.
- **NPCs are alive.** They walk around, have speech bubbles, react to deal status. Not static cards.
- **AI-generated 3D → sprite animation** for character assets (Meshy/Tripo3D → PNG renders → CSS/PixiJS animation).
- **Mobile-friendly.** Responsive web at minimum.

## Conventions

- Use TypeScript for all code
- Use Convex for all backend logic (no separate API server)
- Use v0 to generate UI components quickly, then customize
- Prefer simple, working code over clever abstractions
- Every agent interaction should offer Claude Code-style choices to the user
- Keep the codebase flat — avoid deep nesting

## Judging Criteria (What Matters)

| Criteria | Weight |
|----------|--------|
| **Impact Potential** | **40%** — "Could this be a real startup?" |
| Creativity | 20% — Unexpected solution to a known problem |
| Technical Difficulty | 20% — Real engineering, not just API glue |
| Demo & Presentation | 20% — Wow factor, clean UX, clear narrative |

## Important Context

- Pre-built code = disqualified. Everything must be built during the hackathon.
- 4-minute demo: 3 min demo + 1 min Q&A
- Judges are all YC founders — they think "is this a startup?"
- Browser Use is the host — make Browser Use look incredible
- Impact Potential is 2x everything else. Show this could be a real company.
