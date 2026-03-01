import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";

interface ForageStore {
  // User
  userId: Id<"users"> | null;
  setUserId: (id: Id<"users">) => void;

  // Village UI
  selectedVendorId: Id<"vendors"> | null;
  setSelectedVendorId: (id: Id<"vendors"> | null) => void;

  // Chat
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Active quest
  activeQuestId: Id<"quests"> | null;
  setActiveQuestId: (id: Id<"quests"> | null) => void;

  // Agent status
  agentBusy: boolean;
  agentStatus: string;
  setAgentBusy: (busy: boolean, status?: string) => void;

  // Tree popup
  treeOpen: boolean;
  setTreeOpen: (open: boolean) => void;

  // Init (minimal — most data now in Convex DB)
  initFromLocalStorage: () => void;
}

export const useForageStore = create<ForageStore>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),

  selectedVendorId: null,
  setSelectedVendorId: (id) => set({ selectedVendorId: id }),

  chatOpen: true,
  setChatOpen: (open) => set({ chatOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeQuestId: null,
  setActiveQuestId: (id) => set({ activeQuestId: id }),

  agentBusy: false,
  agentStatus: "",
  setAgentBusy: (busy, status = "") => set({ agentBusy: busy, agentStatus: status }),

  treeOpen: false,
  setTreeOpen: (open) => set({ treeOpen: open }),

  // Minimal init — userId is restored from cookie/session, quest from DB
  initFromLocalStorage: () => {
    // No-op now. Session restore happens via cookie/NextAuth in page components.
  },
}));
