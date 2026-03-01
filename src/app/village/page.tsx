"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import nextDynamic from "next/dynamic";
import { GameHUD } from "@/components/village/GameHUD";
import { NPCDialogue } from "@/components/village/NPCDialogue";
import { ForageSearch } from "@/components/village/ForageSearch";
import { VillageTutorial } from "@/components/village/VillageTutorial";
import { DemoSeed } from "@/components/village/DemoSeed";
import { useForageStore } from "@/lib/store";
import { LS_USER_ID } from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";

type VendorDoc = Doc<"vendors">;

const VillageCanvas = nextDynamic(
  () => import("@/components/village/VillageCanvas").then((m) => m.VillageCanvas),
  { ssr: false }
);

export default function VillagePage() {
  const router = useRouter();
  const userId = useForageStore((s) => s.userId);
  const setUserId = useForageStore((s) => s.setUserId);

  const [dialogueVendor, setDialogueVendor] = useState<VendorDoc | null>(null);
  const [forageSearchOpen, setForageSearchOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    const savedId = localStorage.getItem(LS_USER_ID);
    if (savedId && !userId) {
      setUserId(savedId as Parameters<typeof setUserId>[0]);
    } else if (!savedId && !userId) {
      router.replace("/");
    }
  }, [router, userId, setUserId]);

  // Escape key closes dialogues
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDialogueVendor(null);
        setForageSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleTalkToVendor = useCallback((vendor: VendorDoc) => {
    setForageSearchOpen(false);
    setDialogueVendor(vendor);
  }, []);

  const handleTalkToHQ = useCallback(() => {
    setDialogueVendor(null);
    setForageSearchOpen(true);
  }, []);

  const dialogueOpen = !!dialogueVendor || forageSearchOpen;

  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ background: "var(--grass)" }}>
      {/* Full-screen village canvas */}
      <VillageCanvas
        onTalkToVendor={handleTalkToVendor}
        onTalkToHQ={handleTalkToHQ}
        dialogueOpen={dialogueOpen}
      />

      {/* Floating HUD overlays */}
      <GameHUD onForageOpen={handleTalkToHQ} />

      {/* ACNH-style dialogue panels */}
      <AnimatePresence>
        {dialogueVendor && (
          <NPCDialogue
            key={dialogueVendor._id}
            vendor={dialogueVendor}
            onClose={() => setDialogueVendor(null)}
          />
        )}
        {forageSearchOpen && !dialogueVendor && (
          <ForageSearch
            key="forage-search"
            onClose={() => setForageSearchOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* First-time overlays */}
      <DemoSeed />
      <VillageTutorial />
    </div>
  );
}
