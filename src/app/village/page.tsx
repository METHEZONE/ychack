"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import nextDynamic from "next/dynamic";
import { VillageSidebar } from "@/components/village/VillageSidebar";
import { ChatBar } from "@/components/chat/ChatBar";
import { Nav } from "@/components/ui/Nav";
import { VillageTutorial } from "@/components/village/VillageTutorial";
import { DemoSeed } from "@/components/village/DemoSeed";
import { useForageStore } from "@/lib/store";
import { LS_USER_ID } from "@/lib/constants";

const VillageCanvas = nextDynamic(
  () => import("@/components/village/VillageCanvas").then((m) => m.VillageCanvas),
  { ssr: false }
);

export default function VillagePage() {
  const router = useRouter();
  const userId = useForageStore((s) => s.userId);
  const setUserId = useForageStore((s) => s.setUserId);

  useEffect(() => {
    const savedId = localStorage.getItem(LS_USER_ID);
    if (savedId && !userId) {
      setUserId(savedId as Parameters<typeof setUserId>[0]);
    } else if (!savedId && !userId) {
      router.replace("/");
    }
  }, [router, userId, setUserId]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--grass)" }}>
      <Nav />
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 relative">
          <VillageCanvas />
        </div>
        <VillageSidebar />
      </div>
      <ChatBar />
      <VillageTutorial />
      <DemoSeed />
    </div>
  );
}
