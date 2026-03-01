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

  // Approved vendors (backed by localStorage)
  approvedVendorIds: Set<string>;
  approveVendor: (id: string) => void;
  isApproved: (id: string) => boolean;

  // Seen notifications (backed by localStorage)
  seenVendorIds: Set<string>;
  markVendorSeen: (id: string) => void;
  isSeen: (id: string) => boolean;

  // Init from localStorage (call on mount)
  initFromLocalStorage: () => void;
}

const LS_APPROVED = "forage_approved";
const LS_SEEN = "forage_seen";

export const useForageStore = create<ForageStore>((set, get) => ({
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

  // Approved vendors
  approvedVendorIds: new Set(),
  approveVendor: (id) => {
    set((s) => {
      const next = new Set(s.approvedVendorIds);
      next.add(id);
      try { localStorage.setItem(LS_APPROVED, JSON.stringify([...next])); } catch {}
      return { approvedVendorIds: next };
    });
  },
  isApproved: (id) => get().approvedVendorIds.has(id),

  // Seen vendor notifications
  seenVendorIds: new Set(),
  markVendorSeen: (id) => {
    set((s) => {
      const next = new Set(s.seenVendorIds);
      next.add(id);
      try { localStorage.setItem(LS_SEEN, JSON.stringify([...next])); } catch {}
      return { seenVendorIds: next };
    });
  },
  isSeen: (id) => get().seenVendorIds.has(id),

  // Init from localStorage on page mount
  initFromLocalStorage: () => {
    try {
      const approved = JSON.parse(localStorage.getItem(LS_APPROVED) || "[]");
      const seen = JSON.parse(localStorage.getItem(LS_SEEN) || "[]");
      set({
        approvedVendorIds: new Set(approved as string[]),
        seenVendorIds: new Set(seen as string[]),
      });
    } catch {}
  },
}));
