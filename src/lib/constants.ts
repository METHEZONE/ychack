// Vendor deal stages
export const VENDOR_STAGES = [
  "discovered",
  "contacted",
  "replied",
  "negotiating",
  "closed",
  "dead",
] as const;

export type VendorStage = (typeof VENDOR_STAGES)[number];

export const STAGE_LABELS: Record<VendorStage, string> = {
  discovered: "Discovered",
  contacted: "Contacted",
  replied: "Replied",
  negotiating: "Negotiating",
  closed: "Closed",
  dead: "No Reply",
};

export const STAGE_COLORS: Record<VendorStage, string> = {
  discovered: "#94a3b8",
  contacted: "#60a5fa",
  replied: "#34d399",
  negotiating: "#fbbf24",
  closed: "#6b9e5e",
  dead: "#f87171",
};

// Quest statuses
export const QUEST_STATUSES = ["active", "completed", "paused"] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

// Village layout
export const VILLAGE_WIDTH = 1200;
export const VILLAGE_HEIGHT = 800;
export const NPC_SIZE = 48;
export const HQ_X = VILLAGE_WIDTH / 2;
export const HQ_Y = VILLAGE_HEIGHT / 2;

// NPC spawn positions (relative to HQ)
export const NPC_SPAWN_OFFSETS = [
  { x: -200, y: -150 },
  { x: 200, y: -150 },
  { x: -300, y: 50 },
  { x: 300, y: 50 },
  { x: 0, y: -250 },
  { x: -150, y: 200 },
  { x: 150, y: 200 },
  { x: -350, y: -50 },
  { x: 350, y: -50 },
  { x: 0, y: 250 },
];

// Chat
export const MAX_CHAT_HISTORY = 50;

// App name
export const APP_NAME = "Forage";
export const APP_TAGLINE = "Find vendors. Build your product.";

// Local storage keys
export const LS_USER_ID = "forage_user_id";
