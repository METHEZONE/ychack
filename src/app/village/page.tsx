"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import nextDynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GameHUD } from "@/components/village/GameHUD";
import { NPCDialogue } from "@/components/village/NPCDialogue";
import { ForageSearch } from "@/components/village/ForageSearch";
import { HQInterior } from "@/components/village/HQInterior";
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
  const initFromLocalStorage = useForageStore((s) => s.initFromLocalStorage);
  const approveVendor = useForageStore((s) => s.approveVendor);
  const isApproved = useForageStore((s) => s.isApproved);

  const [dialogueVendor, setDialogueVendor] = useState<VendorDoc | null>(null);
  const [forageSearchOpen, setForageSearchOpen] = useState(false);
  const [hqOpen, setHqOpen] = useState(false);
  const [moveInVendorId, setMoveInVendorId] = useState<string | null>(null);

  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  // Auth guard + init store from localStorage
  useEffect(() => {
    initFromLocalStorage();
    const savedId = localStorage.getItem(LS_USER_ID);
    if (savedId && !userId) {
      setUserId(savedId as Parameters<typeof setUserId>[0]);
    } else if (!savedId && !userId) {
      router.replace("/");
    }
  }, [router, userId, setUserId, initFromLocalStorage]);

  // Migration: auto-approve all existing vendors on first load
  // (before this feature existed, all vendors were shown on map)
  useEffect(() => {
    if (!vendors || vendors.length === 0) return;
    const migrated = localStorage.getItem("forage_migration_v1");
    if (migrated) return;
    vendors.forEach((v: VendorDoc) => {
      if (!isApproved(v._id)) approveVendor(v._id);
    });
    localStorage.setItem("forage_migration_v1", "1");
  }, [vendors, isApproved, approveVendor]);

  // Escape closes all panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDialogueVendor(null);
        setForageSearchOpen(false);
        setHqOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleTalkToVendor = useCallback((vendor: VendorDoc) => {
    setForageSearchOpen(false);
    setHqOpen(false);
    setDialogueVendor(vendor);
  }, []);

  const handleOpenHQ = useCallback(() => {
    setDialogueVendor(null);
    setForageSearchOpen(false);
    setHqOpen(true);
  }, []);

  const handleForageOpen = useCallback(() => {
    setDialogueVendor(null);
    setHqOpen(false);
    setForageSearchOpen(true);
  }, []);

  // Called from HQInterior when user approves a vendor
  const handleApproveVendor = useCallback((vendor: VendorDoc) => {
    setHqOpen(false);
    setMoveInVendorId(vendor._id);
  }, []);

  const dialogueOpen = !!dialogueVendor || forageSearchOpen || hqOpen;

  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ background: "var(--grass)" }}>
      {/* Full-screen game canvas */}
      <VillageCanvas
        onTalkToVendor={handleTalkToVendor}
        onOpenHQ={handleOpenHQ}
        dialogueOpen={dialogueOpen}
        moveInVendorId={moveInVendorId}
        onMoveInComplete={() => setMoveInVendorId(null)}
      />

      {/* Floating HUD */}
      <GameHUD onForageOpen={handleForageOpen} onHQOpen={handleOpenHQ} />

      {/* Panels */}
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
        {hqOpen && (
          <HQInterior
            key="hq-interior"
            onClose={() => setHqOpen(false)}
            onApprove={handleApproveVendor}
          />
        )}
      </AnimatePresence>

      <DemoSeed />
      <VillageTutorial />
    </div>
  );
}
