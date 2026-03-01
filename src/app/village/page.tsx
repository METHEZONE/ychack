"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import nextDynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GameHUD } from "@/components/village/GameHUD";
import { QuestPanel } from "@/components/village/QuestPanel";
import { NPCDialogue } from "@/components/village/NPCDialogue";
import { ForageSearch } from "@/components/village/ForageSearch";
import { HQInterior } from "@/components/village/HQInterior";
import { VillageTutorial } from "@/components/village/VillageTutorial";
import { DemoSeed } from "@/components/village/DemoSeed";
import { GomiDataCollect } from "@/components/village/GomiDataCollect";
import { useForageStore } from "@/lib/store";
import { LS_USER_ID } from "@/lib/constants";
import { Doc, Id } from "../../../convex/_generated/dataModel";

type VendorDoc = Doc<"vendors">;

const VillageCanvas = nextDynamic(
  () => import("@/components/village/VillageCanvas").then((m) => m.VillageCanvas),
  { ssr: false }
);

function VillagePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = useForageStore((s) => s.userId);
  const setUserId = useForageStore((s) => s.setUserId);
  const initFromLocalStorage = useForageStore((s) => s.initFromLocalStorage);
  const bulkApprove = useMutation(api.vendors.bulkApprove);

  const [dialogueVendor, setDialogueVendor] = useState<VendorDoc | null>(null);
  const [forageSearchOpen, setForageSearchOpen] = useState(false);
  const [hqOpen, setHqOpen] = useState(false);
  const [gomiCollectOpen, setGomiCollectOpen] = useState(false);
  const [returnVendorId, setReturnVendorId] = useState<string | null>(null);

  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");
  const user = useQuery(api.users.get, userId ? { userId } : "skip");

  const onboardingDone = user?.gomiOnboardingDone === true;

  // Auth guard
  useEffect(() => {
    initFromLocalStorage();
    const savedId = localStorage.getItem(LS_USER_ID);
    if (savedId && !userId) {
      setUserId(savedId as Id<"users">);
      return;
    }
    if (!savedId && !userId) {
      fetch("/api/auth/local-session")
        .then((r) => r.json())
        .then((data) => {
          if (data.userId) {
            localStorage.setItem(LS_USER_ID, data.userId);
            setUserId(data.userId as Parameters<typeof setUserId>[0]);
          } else {
            router.replace("/");
          }
        })
        .catch(() => router.replace("/"));
    }
  }, [router, userId, setUserId, initFromLocalStorage]);

  // Auto-open mandatory Gomi onboarding
  useEffect(() => {
    if (user && !user.gomiOnboardingDone) {
      setGomiCollectOpen(true);
    }
  }, [user]);

  // Migration
  useEffect(() => {
    if (!vendors || vendors.length === 0) return;
    const migrated = localStorage.getItem("forage_migration_v2");
    if (migrated) return;
    const toApprove = vendors
      .filter((v: VendorDoc) => v.userApproved === undefined || v.userApproved === null)
      .map((v: VendorDoc) => v._id as Id<"vendors">);
    if (toApprove.length > 0) bulkApprove({ vendorIds: toApprove });
    localStorage.setItem("forage_migration_v2", "1");
  }, [vendors, bulkApprove]);

  // Auto-open Gomi collect on ?collectData=true
  useEffect(() => {
    if (searchParams.get("collectData") === "true" && userId) {
      setGomiCollectOpen(true);
      setReturnVendorId(searchParams.get("returnVendor"));
      window.history.replaceState({}, "", "/village");
    }
  }, [searchParams, userId]);

  // Escape closes panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (gomiCollectOpen && !onboardingDone) return;
        setDialogueVendor(null);
        setForageSearchOpen(false);
        setHqOpen(false);
        setGomiCollectOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gomiCollectOpen, onboardingDone]);

  const handleSelectQuest = useCallback((questId: Id<"quests">) => {
    useForageStore.getState().setActiveQuestId(questId);
    router.push("/tree");
  }, [router]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const handleApproveVendor = useCallback((vendor: VendorDoc) => {
    setHqOpen(false);
    router.push(`/vendor/${vendor._id}`);
  }, [router]);

  const handleOpenGomiCollect = useCallback(() => {
    setDialogueVendor(null);
    setForageSearchOpen(false);
    setHqOpen(false);
    setGomiCollectOpen(true);
    setReturnVendorId(null);
  }, []);

  const dialogueOpen = !!dialogueVendor || forageSearchOpen || hqOpen || gomiCollectOpen;

  return (
    <div className="w-full h-screen flex overflow-hidden" style={{ background: "var(--grass)" }}>
      {/* ── Left: Quest panel ── */}
      <QuestPanel />

      {/* ── Right: Game canvas + HUD ── */}
      <div className="flex-1 relative overflow-hidden">
        <VillageCanvas
          onSelectQuest={handleSelectQuest}
          onOpenHQ={handleOpenHQ}
          onOpenGomiCollect={handleOpenGomiCollect}
          dialogueOpen={dialogueOpen}
        />

        {/* HUD overlay */}
        <GameHUD onHQOpen={handleOpenHQ} />

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
              onForageOpen={handleForageOpen}
            />
          )}
          {gomiCollectOpen && (
            <GomiDataCollect
              key="gomi-collect"
              onClose={() => setGomiCollectOpen(false)}
              returnVendorId={returnVendorId}
              isMandatory={!onboardingDone}
            />
          )}
        </AnimatePresence>

        <DemoSeed />
        {onboardingDone && <VillageTutorial />}
      </div>
    </div>
  );
}

export default function VillagePage() {
  return (
    <Suspense>
      <VillagePageInner />
    </Suspense>
  );
}
