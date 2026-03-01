"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { NPC } from "./NPC";
import {
  VILLAGE_WIDTH,
  VILLAGE_HEIGHT,
  NPC_SPAWN_OFFSETS,
} from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";
import { ANIMAL_EMOJI, AnimalType } from "@/lib/animals";
import { playClick, playChime } from "@/lib/sounds";

type VendorDoc = Doc<"vendors">;

interface VillageCanvasProps {
  onTalkToVendor: (vendor: VendorDoc) => void;
  onOpenHQ: () => void;
  dialogueOpen: boolean;
  moveInVendorId: string | null;
  onMoveInComplete: () => void;
}

// Player speed (% per 60fps frame)
const SPEED = 0.38;
const PROX_NPC_X = 11;
const PROX_NPC_Y = 8;
const HQ_PROX_X = 9;
const HQ_PROX_Y = 7;
const HQ_PCT_X = 50;
const HQ_PCT_Y = 50;

export function VillageCanvas({
  onTalkToVendor,
  onOpenHQ,
  dialogueOpen,
  moveInVendorId,
  onMoveInComplete,
}: VillageCanvasProps) {
  const userId = useForageStore((s) => s.userId);
  const isApproved = useForageStore((s) => s.isApproved);

  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  // Only show on map if approved
  const approvedVendors = (vendors ?? []).filter((v: VendorDoc) => isApproved(v._id));

  // DOM refs for game loop
  const playerRef = useRef<HTMLDivElement>(null);
  const playerShadowRef = useRef<HTMLDivElement>(null);

  // Stable refs
  const keysRef = useRef(new Set<string>());
  const dialogueOpenRef = useRef(dialogueOpen);
  const vendorsRef = useRef<VendorDoc[]>([]);
  const onTalkToVendorRef = useRef(onTalkToVendor);
  const onOpenHQRef = useRef(onOpenHQ);
  const nearbyVendorIdRef = useRef<string | null>(null);
  const nearbyHQRef = useRef(false);
  const playerPos = useRef({ x: 50, y: 65 });
  const facingRef = useRef(1);

  const [nearbyVendorId, setNearbyVendorId] = useState<string | null>(null);
  const [nearbyHQ, setNearbyHQ] = useState(false);
  const [newlyApprovedId, setNewlyApprovedId] = useState<string | null>(null);

  useEffect(() => { dialogueOpenRef.current = dialogueOpen; }, [dialogueOpen]);
  useEffect(() => { vendorsRef.current = approvedVendors; }, [approvedVendors]);
  useEffect(() => { onTalkToVendorRef.current = onTalkToVendor; }, [onTalkToVendor]);
  useEffect(() => { onOpenHQRef.current = onOpenHQ; }, [onOpenHQ]);

  // Move-in cutscene trigger
  useEffect(() => {
    if (moveInVendorId) {
      setNewlyApprovedId(moveInVendorId);
      playChime();
      // Clear "new" flag after animation completes
      const t = setTimeout(() => {
        setNewlyApprovedId(null);
        onMoveInComplete();
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [moveInVendorId, onMoveInComplete]);

  // Set initial player DOM position
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.style.left = "calc(50% - 22px)";
      playerRef.current.style.top = "calc(65% - 38px)";
    }
    if (playerShadowRef.current) {
      playerShadowRef.current.style.left = "calc(50% - 14px)";
      playerShadowRef.current.style.top = "calc(65% - 5px)";
    }
  }, []);

  const getNpcPositions = useCallback(() =>
    vendorsRef.current.map((_, i) => {
      const off = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
      return {
        x: 50 + (off.x / VILLAGE_WIDTH) * 100,
        y: 50 + (off.y / VILLAGE_HEIGHT) * 100,
      };
    }),
  []);

  // rAF game loop
  useEffect(() => {
    let animFrame: number;
    let lastWalking = false;
    let lastFacing = 1;
    const emojiEl = () => playerRef.current?.querySelector<HTMLElement>(".player-emoji");

    const loop = () => {
      const el = playerRef.current;
      const shadowEl = playerShadowRef.current;
      if (!el) { animFrame = requestAnimationFrame(loop); return; }

      if (!dialogueOpenRef.current) {
        const pos = playerPos.current;
        const keys = keysRef.current;
        let dx = 0, dy = 0;

        if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= SPEED;
        if (keys.has("KeyS") || keys.has("ArrowDown")) dy += SPEED;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= SPEED;
        if (keys.has("KeyD") || keys.has("ArrowRight")) dx += SPEED;

        const moving = dx !== 0 || dy !== 0;
        if (moving) {
          pos.x = Math.max(3, Math.min(96, pos.x + dx));
          pos.y = Math.max(35, Math.min(88, pos.y + dy));
          if (dx !== 0) facingRef.current = dx > 0 ? 1 : -1;
        }

        el.style.left = `calc(${pos.x}% - 22px)`;
        el.style.top = `calc(${pos.y}% - 38px)`;
        if (shadowEl) {
          shadowEl.style.left = `calc(${pos.x}% - 14px)`;
          shadowEl.style.top = `calc(${pos.y}% - 5px)`;
        }

        if (moving !== lastWalking) {
          lastWalking = moving;
          el.classList.toggle("player-walking", moving);
        }
        if (facingRef.current !== lastFacing) {
          lastFacing = facingRef.current;
          const emp = emojiEl();
          if (emp) emp.style.transform = `scaleX(${facingRef.current})`;
        }

        // Proximity
        const npcPositions = getNpcPositions();
        let foundVendorId: string | null = null;
        npcPositions.forEach((npcPos, i) => {
          const v = vendorsRef.current[i];
          if (!v || v.stage === "dead") return;
          if (Math.abs(pos.x - npcPos.x) < PROX_NPC_X && Math.abs(pos.y - npcPos.y) < PROX_NPC_Y) {
            foundVendorId = v._id;
          }
        });
        const foundHQ = Math.abs(pos.x - HQ_PCT_X) < HQ_PROX_X && Math.abs(pos.y - HQ_PCT_Y) < HQ_PROX_Y;

        if (foundVendorId !== nearbyVendorIdRef.current) {
          nearbyVendorIdRef.current = foundVendorId;
          setNearbyVendorId(foundVendorId);
        }
        if (foundHQ !== nearbyHQRef.current) {
          nearbyHQRef.current = foundHQ;
          setNearbyHQ(foundHQ);
        }
      }
      animFrame = requestAnimationFrame(loop);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if ((e.code === "KeyE" || e.code === "Space") && !dialogueOpenRef.current) {
        e.preventDefault();
        if (nearbyVendorIdRef.current) {
          const vendor = vendorsRef.current.find((v) => v._id === nearbyVendorIdRef.current);
          if (vendor) { playClick(); onTalkToVendorRef.current(vendor); }
        } else if (nearbyHQRef.current) {
          playClick(); onOpenHQRef.current();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.code); };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    animFrame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Pixel art village background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/background.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex: 0 }}
        draggable={false}
      />

      {/* HQ interaction zone */}
      <div className="absolute flex flex-col items-center" style={{ left: `calc(50% - 36px)`, top: `calc(50% - 16px)`, zIndex: 10 }}>
        <AnimatePresence>
          {nearbyHQ && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="whitespace-nowrap text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-lg"
              style={{ background: "var(--accent)", color: "var(--text)", border: "2px solid var(--accent-hover)" }}
            >
              💬 Press E to enter HQ
            </motion.div>
          )}
        </AnimatePresence>
        {!nearbyHQ && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" style={{ background: "rgba(255,255,255,0.88)", color: "var(--primary-dark)", border: "1.5px solid var(--border-game)" }}>
            🏡 HQ
          </span>
        )}
      </div>


      {/* Move-in celebration overlay */}
      <AnimatePresence>
        {newlyApprovedId && (() => {
          const vendor = approvedVendors.find((v: VendorDoc) => v._id === newlyApprovedId);
          if (!vendor) return null;
          const emoji = ANIMAL_EMOJI[vendor.animalType as AnimalType] ?? "🐾";
          return (
            <motion.div
              key="movein"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="absolute top-1/4 left-1/2 z-50 pointer-events-none"
              style={{ transform: "translateX(-50%)" }}
            >
              <div
                className="flex items-center gap-3 px-5 py-3 rounded-3xl shadow-2xl"
                style={{ background: "var(--cream)", border: "3px solid var(--primary)" }}
              >
                <span className="text-3xl">{emoji}</span>
                <div>
                  <div className="text-sm font-extrabold" style={{ color: "var(--primary-dark)" }}>
                    {vendor.characterName} is moving in! 🎉
                  </div>
                  <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {vendor.companyName} just joined your village
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Player shadow */}
      <div ref={playerShadowRef} className="absolute rounded-full pointer-events-none" style={{ width: 28, height: 10, background: "rgba(0,0,0,0.18)", filter: "blur(4px)", zIndex: 19 }} />

      {/* Player character */}
      <div ref={playerRef} className="absolute flex flex-col items-center pointer-events-none select-none" style={{ zIndex: 26 }}>
        <span className="player-emoji" style={{ display: "inline-block", fontSize: "2.4rem", transform: "scaleX(1)" }}>🙂</span>
        {(nearbyVendorId || nearbyHQ) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="absolute whitespace-nowrap text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-md"
            style={{ bottom: "calc(100% + 2px)", left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "var(--text)", border: "2px solid var(--accent-hover)" }}
          >
            💬 Press E
          </motion.div>
        )}
      </div>

      {/* Vendor NPCs — move-in animation */}
      {approvedVendors.map((vendor: VendorDoc, i: number) => {
        const offset = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
        const spawnX = 50 + (offset.x / VILLAGE_WIDTH) * 100;
        const spawnY = 50 + (offset.y / VILLAGE_HEIGHT) * 100;
        const isMovingIn = vendor._id === newlyApprovedId;
        return (
          <NPC
            key={vendor._id}
            vendor={vendor}
            spawnX={spawnX}
            spawnY={spawnY}
            index={i}
            isNearby={nearbyVendorId === vendor._id}
            isMovingIn={isMovingIn}
            onClick={() => { playClick(); onTalkToVendor(vendor); }}
          />
        );
      })}

      {/* Empty village hint */}
      {approvedVendors.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: "80px", zIndex: 10 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="text-center px-8 py-5 rounded-3xl shadow-lg"
            style={{ background: "rgba(255,251,230,0.92)", border: "3px solid var(--border-game)" }}
          >
            <div className="text-5xl mb-3">🌿</div>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Your village is empty!</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--muted)" }}>
              Press 🌿 Find Vendors, or walk into 🏡 HQ
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
