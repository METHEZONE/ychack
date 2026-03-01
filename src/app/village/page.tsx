"use client";

// Next.js route config — must be dynamic (uses Convex hooks)
export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";
import { VillageSidebar } from "@/components/village/VillageSidebar";
import { ChatBar } from "@/components/chat/ChatBar";
import { Nav } from "@/components/ui/Nav";

// PixiJS requires browser APIs — must be client-side only
const VillageCanvas = nextDynamic(
  () =>
    import("@/components/village/VillageCanvas").then(
      (m) => m.VillageCanvas
    ),
  { ssr: false }
);

export default function VillagePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)]">
      <Nav />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main village canvas */}
        <div className="flex-1 relative">
          <VillageCanvas />
        </div>
        {/* NPC sidebar */}
        <VillageSidebar />
      </div>
      {/* Chat bar at bottom */}
      <ChatBar />
    </div>
  );
}
