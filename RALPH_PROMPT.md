Fix two broken features in the Forage codebase. Output <promise>FIXES COMPLETE</promise> when done and TypeScript passes clean.

## Fix 1: "Send reply ✓" button handler (CRITICAL)

### Problem
When a vendor replies to an email, `handleInboundEmail` in `convex/actions/agentmail.ts` creates a chatMessage with:
- content: "📨 **VendorName** replied! ... **Draft reply ready.** Want me to send it?"
- choices: ["Send reply ✓", "Edit first", "Skip for now"]
- metadata: { action: "approve_reply", vendorId, draftMessageId, inboxId, toEmail, subject }

But the frontend has NO handler for this. When user clicks "Send reply ✓" nothing happens.

### Files to check first
- `src/components/chat/ChatMessage.tsx` — renders chat messages + choice buttons
- `src/components/chat/ChoiceButtons.tsx` — renders choice buttons, calls onSelect(choice)
- `src/components/chat/ChatBar.tsx` — the main chat container that handles choices
- `convex/actions/agentmail.ts` — has `sendDraftReply` action

### Fix
In ChatBar.tsx (or wherever onChoiceSelect is handled), when a choice is clicked:
1. Check if the message has `metadata.action === "approve_reply"`
2. If choice === "Send reply ✓", call `api.actions.agentmail.sendDraftReply` with:
   - draftMessageId: metadata.draftMessageId
   - vendorId: metadata.vendorId
   - toEmail: metadata.toEmail
   - inboxId: metadata.inboxId
   - subject: metadata.subject
3. Show a loading state / confirmation in chat after sending

Read the files first to understand the existing pattern before editing.

## Fix 2: Save contactEmail to vendor DB (MINOR)

### Problem
In `convex/actions/forage.ts`, Tavily returns `raw.contactEmail` for each vendor.
The email is used to send outreach but NEVER saved to the vendor record in DB.

### Fix
In `convex/actions/forage.ts`, inside the `Promise.all` loop, after `ctx.runMutation(api.vendors.create, {...})`:
- If `raw.contactEmail` exists, call `ctx.runMutation(api.vendors.updateStage, { vendorId, stage: "discovered", contactEmail: raw.contactEmail })`

OR simply pass `contactEmail` directly to `api.vendors.create` — check if the create mutation accepts it. If not, add it.

Read `convex/vendors.ts` to check the create mutation args first.

## Completion criteria
- Clicking "Send reply ✓" in chat calls sendDraftReply and shows feedback
- contactEmail from Tavily is saved to vendor DB
- `npx tsc --noEmit` passes with zero errors
- No new files created unless absolutely necessary

Working directory: /Users/minsungpark/MY ZONE/code/yc
