# Forage — Scaffolding Plan

## Phase 1: Initialize Next.js Project
- [x] Run `npx create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, src-dir
- [x] Install Convex: `npm install convex`
- [ ] Run `npx convex dev --once` to initialize convex/ dir and .env.local ← MANUAL STEP (requires login)

## Phase 2: Install All Dependencies
- [x] Install: `pixi.js @pixi/react framer-motion zustand zod @anthropic-ai/sdk`
- [x] Install agentmail SDK (package: `agentmail`)
- [x] Verify package.json has all deps listed

## Phase 3: Convex Schema
- [x] Create `convex/schema.ts` with 6 tables: users, quests, vendors, messages, chatMessages, workflowNodes
- [ ] Run `npx convex dev --once` to validate schema ← MANUAL STEP (requires login)

## Phase 4: Convex Mutations/Queries
- [x] Create `convex/users.ts` — create, get, updateCompanyData
- [x] Create `convex/quests.ts` — create, listByUser, updateStatus
- [x] Create `convex/vendors.ts` — create, listByQuest, listByUser, updateStage
- [x] Create `convex/messages.ts` — create, listByVendor
- [x] Create `convex/chatMessages.ts` — create, listByUser
- [x] Create `convex/workflowNodes.ts` — create, listByQuest

## Phase 5: Convex Actions (use node)
- [x] Create `convex/actions/browserUse.ts` — findVendors, scrapeWebsite, fillContactForm
- [x] Create `convex/actions/agentmail.ts` — createVendorInbox, sendEmail
- [x] Create `convex/actions/claude.ts` — analyzeVendor, draftNegotiationEmail, generateChatResponse
- [x] Create `convex/http.ts` — AgentMail webhook endpoint

## Phase 6: Next.js Layout + Provider
- [x] Create `src/app/ConvexClientProvider.tsx`
- [x] Update `src/app/layout.tsx` — wrap with ConvexClientProvider, set metadata for Forage
- [x] Update `src/app/globals.css` — base Tailwind styles, custom font if needed

## Phase 7: Pages (Routes)
- [x] Create `src/app/page.tsx` — landing/onboarding stub
- [x] Create `src/app/village/page.tsx` — village view stub
- [x] Create `src/app/vendor/[id]/page.tsx` — NPC detail stub
- [x] Create `src/app/tree/page.tsx` — decision tree stub

## Phase 8: Lib / Store
- [x] Create `src/lib/store.ts` — Zustand store (selectedVendor, chatOpen, sidebarOpen, userId)
- [x] Create `src/lib/animals.ts` — animal types array + random assignment helper
- [x] Create `src/lib/constants.ts` — NPC stages, app constants

## Phase 9: Component Stubs — Village
- [x] Create `src/components/village/VillageCanvas.tsx` — PixiJS canvas (dynamic import, ssr: false)
- [x] Create `src/components/village/NPC.tsx` — animated sprite placeholder
- [x] Create `src/components/village/VillageSidebar.tsx` — NPC list sidebar

## Phase 10: Component Stubs — Chat
- [x] Create `src/components/chat/ChatBar.tsx` — bottom chat bar
- [x] Create `src/components/chat/ChoiceButtons.tsx` — Claude Code-style choice buttons
- [x] Create `src/components/chat/ChatMessage.tsx` — message bubble component

## Phase 11: Component Stubs — Vendor
- [x] Create `src/components/vendor/VendorDetail.tsx` — vendor profile + email thread
- [x] Create `src/components/vendor/DealProgress.tsx` — stage progress bar
- [x] Create `src/components/vendor/EmailThread.tsx` — email messages as chat bubbles

## Phase 12: Component Stubs — Tree + Onboarding + UI
- [x] Create `src/components/tree/DecisionTree.tsx` — tree visualization stub
- [x] Create `src/components/tree/TreeNode.tsx` — individual tree node
- [x] Create `src/components/onboarding/OnboardingFlow.tsx` — wizard steps
- [x] Create `src/components/onboarding/CompanySetup.tsx` — website scrape + guided questions
- [x] Create `src/components/onboarding/NeedsSelector.tsx` — checkbox list of needs
- [x] Create `src/components/ui/Nav.tsx` — top navigation
- [x] Create `src/components/ui/Toast.tsx` — notification toasts

## Phase 13: Wire Up Village Page
- [x] Import VillageCanvas, ChatBar, VillageSidebar into village/page.tsx
- [x] Add basic layout (full screen canvas + sidebar + bottom chat bar)

## Phase 14: Wire Up Onboarding Page
- [x] Import OnboardingFlow into page.tsx
- [x] Connect to Convex users.create mutation

## Phase 15: Verification
- [x] Run `npm run build` — zero TypeScript errors, all 4 routes in build output
- [ ] Run `npx convex dev --once` — schema deploys, all 6 tables visible ← MANUAL STEP
- [x] Confirm all 4 routes render without crashing (/  /village  /tree  /vendor/[id])
- [x] Confirm Convex functions have no type errors (excluded from Next.js tsconfig, Convex checks separately)

## ⚡ NEXT STEPS (Before Hackathon Starts)
1. Run `npx convex dev` → pick/create a project → updates NEXT_PUBLIC_CONVEX_URL in .env.local
2. Add AGENTMAIL_API_KEY to .env.local (sign up at agentmail.to)
3. Run `npm run dev` + `npx convex dev` in parallel → localhost:3000 should show onboarding
4. Add real sprite assets to `public/sprites/` (use Meshy/Tripo3D)
5. Build features on top of this scaffold!
