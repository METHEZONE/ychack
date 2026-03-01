"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { NPC } from "./NPC";
import {
  VILLAGE_WIDTH,
  VILLAGE_HEIGHT,
  HQ_X,
  HQ_Y,
  NPC_SPAWN_OFFSETS,
} from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";
import { playClick } from "@/lib/sounds";

type VendorDoc = Doc<"vendors">;

interface VillageCanvasProps {
  onTalkToVendor: (vendor: VendorDoc) => void;
  onTalkToHQ: () => void;
  dialogueOpen: boolean;
}

// Player speed (% per 60fps frame)
const SPEED = 0.38;
const PROX_NPC_X = 11;
const PROX_NPC_Y = 8;
const HQ_PROX_X = 9;
const HQ_PROX_Y = 7;

// HQ position in % (matched to CSS center)
const HQ_PCT_X = 50;
const HQ_PCT_Y = 50;

export function VillageCanvas({ onTalkToVendor, onTalkToHQ, dialogueOpen }: VillageCanvasProps) {
  const userId = useForageStore((s) => s.userId);

  const vendors = useQuery(
    api.vendors.listByUser,
    userId ? { userId } : "skip"
  );

  // DOM refs for direct imperative updates at 60fps
  const playerRef = useRef<HTMLDivElement>(null);
  const playerShadowRef = useRef<HTMLDivElement>(null);

  // Stable refs (avoid stale closures in rAF loop)
  const keysRef = useRef(new Set<string>());
  const dialogueOpenRef = useRef(dialogueOpen);
  const vendorsRef = useRef<VendorDoc[]>([]);
  const onTalkToVendorRef = useRef(onTalkToVendor);
  const onTalkToHQRef = useRef(onTalkToHQ);
  const nearbyVendorIdRef = useRef<string | null>(null);
  const nearbyHQRef = useRef(false);
  const playerPos = useRef({ x: 50, y: 65 });
  const facingRef = useRef(1); // 1=right, -1=left

  // React state — updated only when nearby status changes (infrequent)
  const [nearbyVendorId, setNearbyVendorId] = useState<string | null>(null);
  const [nearbyHQ, setNearbyHQ] = useState(false);

  // Sync refs to fresh values
  useEffect(() => { dialogueOpenRef.current = dialogueOpen; }, [dialogueOpen]);
  useEffect(() => { vendorsRef.current = vendors ?? []; }, [vendors]);
  useEffect(() => { onTalkToVendorRef.current = onTalkToVendor; }, [onTalkToVendor]);
  useEffect(() => { onTalkToHQRef.current = onTalkToHQ; }, [onTalkToHQ]);

  // Set initial player DOM position imperatively (so React never tracks left/top)
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

  // Compute NPC spawn % positions
  const getNpcPositions = useCallback(() =>
    (vendorsRef.current).map((_, i) => {
      const off = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
      return {
        x: 50 + (off.x / VILLAGE_WIDTH) * 100,
        y: 50 + (off.y / VILLAGE_HEIGHT) * 100,
      };
    }),
  []);

  // rAF game loop — empty deps, reads everything via refs
  useEffect(() => {
    let animFrame: number;
    let lastWalking = false;
    let lastFacing = 1;
    const emojiEl = () => playerRef.current?.querySelector<HTMLElement>(".player-emoji");

    const loop = () => {
      const el = playerRef.current;
      const shadowEl = playerShadowRef.current;

      if (!el) {
        animFrame = requestAnimationFrame(loop);
        return;
      }

      // Freeze movement while dialogue open
      if (!dialogueOpenRef.current) {
        const pos = playerPos.current;
        const keys = keysRef.current;
        let dx = 0;
        let dy = 0;

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

        // Direct DOM position update
        el.style.left = `calc(${pos.x}% - 22px)`;
        el.style.top = `calc(${pos.y}% - 38px)`;
        if (shadowEl) {
          shadowEl.style.left = `calc(${pos.x}% - 14px)`;
          shadowEl.style.top = `calc(${pos.y}% - 5px)`;
        }

        // Walking class toggle (only on change)
        if (moving !== lastWalking) {
          lastWalking = moving;
          el.classList.toggle("player-walking", moving);
        }

        // Facing direction (only on change)
        if (facingRef.current !== lastFacing) {
          lastFacing = facingRef.current;
          const emp = emojiEl();
          if (emp) emp.style.transform = `scaleX(${facingRef.current})`;
        }

        // Proximity detection
        const npcPositions = getNpcPositions();
        let foundVendorId: string | null = null;
        npcPositions.forEach((npcPos, i) => {
          const v = vendorsRef.current[i];
          if (!v || v.stage === "dead") return;
          const ddx = Math.abs(pos.x - npcPos.x);
          const ddy = Math.abs(pos.y - npcPos.y);
          if (ddx < PROX_NPC_X && ddy < PROX_NPC_Y) {
            foundVendorId = v._id;
          }
        });

        const foundHQ =
          Math.abs(pos.x - HQ_PCT_X) < HQ_PROX_X &&
          Math.abs(pos.y - HQ_PCT_Y) < HQ_PROX_Y;

        // Update React state only when nearby status changes
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

      // E or Space to interact
      if ((e.code === "KeyE" || e.code === "Space") && !dialogueOpenRef.current) {
        e.preventDefault();
        if (nearbyVendorIdRef.current) {
          const vendor = vendorsRef.current.find((v) => v._id === nearbyVendorIdRef.current);
          if (vendor) {
            playClick();
            onTalkToVendorRef.current(vendor);
          }
        } else if (nearbyHQRef.current) {
          playClick();
          onTalkToHQRef.current();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

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
      {/* Sky band — top 32% */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "32%",
          background: "linear-gradient(180deg, #C9E8FF 0%, #87CEEB 100%)",
        }}
      >
        {/* Clouds */}
        <div className="cloud-float absolute" style={{ top: "18%", left: "8%", animationDelay: "0s" }}>
          <div style={{ position: "relative", width: 90, height: 36 }}>
            <div style={{ position: "absolute", top: 10, left: 0, width: 50, height: 26, background: "rgba(255,255,255,0.85)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 0, left: 18, width: 40, height: 30, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 8, left: 44, width: 36, height: 24, background: "rgba(255,255,255,0.8)", borderRadius: "50%" }} />
          </div>
        </div>
        <div className="cloud-float-slow absolute" style={{ top: "25%", left: "55%", animationDelay: "-3s" }}>
          <div style={{ position: "relative", width: 72, height: 28 }}>
            <div style={{ position: "absolute", top: 8, left: 0, width: 40, height: 20, background: "rgba(255,255,255,0.8)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 0, left: 14, width: 34, height: 26, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 6, left: 36, width: 28, height: 18, background: "rgba(255,255,255,0.75)", borderRadius: "50%" }} />
          </div>
        </div>
        <div className="cloud-float absolute" style={{ top: "10%", left: "75%", animationDelay: "-5s" }}>
          <div style={{ position: "relative", width: 60, height: 24 }}>
            <div style={{ position: "absolute", top: 6, left: 0, width: 32, height: 18, background: "rgba(255,255,255,0.85)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 0, left: 12, width: 28, height: 22, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 5, left: 30, width: 22, height: 16, background: "rgba(255,255,255,0.8)", borderRadius: "50%" }} />
          </div>
        </div>
      </div>

      {/* Ground — bottom 70% */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: "30%",
          background: "radial-gradient(ellipse at 50% 0%, #7EC850 0%, #6DBD40 50%, #5BA832 100%)",
        }}
      />

      {/* Dirt paths SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VILLAGE_WIDTH} ${VILLAGE_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ pointerEvents: "none" }}
      >
        <ellipse cx={HQ_X} cy={HQ_Y} rx={90} ry={55} fill="#C8935A" opacity={0.55} />
        {(vendors ?? []).map((_: VendorDoc, i: number) => {
          const offset = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
          return (
            <line
              key={i}
              x1={HQ_X} y1={HQ_Y}
              x2={HQ_X + offset.x} y2={HQ_Y + offset.y}
              stroke="#C8935A" strokeWidth="10"
              strokeDasharray="12,9" opacity={0.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* HQ building */}
      <div
        className="absolute flex flex-col items-center"
        style={{ left: `calc(50% - 44px)`, top: `calc(50% - 72px)`, zIndex: 10 }}
      >
        {/* HQ "Press E" indicator */}
        {nearbyHQ && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute whitespace-nowrap text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-md z-20"
            style={{
              bottom: "calc(100% + 64px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--accent)",
              color: "var(--text)",
              border: "2px solid var(--accent-hover)",
            }}
          >
            💬 Press E to search
          </motion.div>
        )}
        {/* Roof triangle */}
        <div style={{ width: 0, height: 0, borderLeft: "38px solid transparent", borderRight: "38px solid transparent", borderBottom: "30px solid #e05c30" }} />
        {/* Building body */}
        <div
          style={{
            width: 68, height: 48, background: "#F5E0C0",
            border: "3px solid #C8935A", borderRadius: "0 0 6px 6px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, position: "relative",
          }}
        >
          <div style={{ width: 14, height: 14, background: "#87CEEB", border: "2px solid #C8935A", borderRadius: 2 }} />
          <div style={{ width: 14, height: 14, background: "#87CEEB", border: "2px solid #C8935A", borderRadius: 2 }} />
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 18, height: 24, background: "#C8935A", borderRadius: "6px 6px 0 0" }} />
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 shadow-sm"
          style={{ background: "rgba(255,255,255,0.9)", color: "var(--primary-dark)", border: "1.5px solid var(--border-game)" }}
        >
          🏡 HQ
        </span>
      </div>

      {/* Decorative elements */}
      {[
        { x: "7%", y: "38%", el: "🌲", size: "2.2rem" },
        { x: "82%", y: "35%", el: "🌲", size: "2.2rem" },
        { x: "4%", y: "65%", el: "🌲", size: "2rem" },
        { x: "88%", y: "68%", el: "🌲", size: "2rem" },
        { x: "42%", y: "33%", el: "🌸", size: "1.4rem" },
        { x: "58%", y: "75%", el: "🌼", size: "1.3rem" },
        { x: "18%", y: "55%", el: "🌻", size: "1.5rem" },
        { x: "73%", y: "52%", el: "🌸", size: "1.3rem" },
        { x: "30%", y: "72%", el: "🪨", size: "1.2rem" },
        { x: "65%", y: "40%", el: "🌿", size: "1.4rem" },
        { x: "12%", y: "80%", el: "🌼", size: "1.2rem" },
        { x: "85%", y: "82%", el: "🌿", size: "1.3rem" },
      ].map((d, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{ left: d.x, top: d.y, fontSize: d.size, zIndex: 2 }}
        >
          {d.el}
        </div>
      ))}

      {/* Player shadow (position set imperatively) */}
      <div
        ref={playerShadowRef}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 28, height: 10,
          background: "rgba(0,0,0,0.18)",
          filter: "blur(4px)",
          zIndex: 19,
        }}
      />

      {/* Player character (position set imperatively) */}
      <div
        ref={playerRef}
        className="absolute flex flex-col items-center pointer-events-none select-none"
        style={{ zIndex: 26 }}
      >
        <span
          className="player-emoji"
          style={{ display: "inline-block", fontSize: "2.4rem", transform: "scaleX(1)" }}
        >
          🙂
        </span>
        {/* Press E tooltip above player when near HQ or NPC */}
        {(nearbyVendorId || nearbyHQ) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute whitespace-nowrap text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-md"
            style={{
              bottom: "calc(100% + 2px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--accent)",
              color: "var(--text)",
              border: "2px solid var(--accent-hover)",
            }}
          >
            💬 Press E
          </motion.div>
        )}
      </div>

      {/* Vendor NPCs */}
      {(vendors ?? []).map((vendor: VendorDoc, i: number) => {
        const offset = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
        const spawnX = 50 + (offset.x / VILLAGE_WIDTH) * 100;
        const spawnY = 50 + (offset.y / VILLAGE_HEIGHT) * 100;
        return (
          <NPC
            key={vendor._id}
            vendor={vendor}
            spawnX={spawnX}
            spawnY={spawnY}
            index={i}
            isNearby={nearbyVendorId === vendor._id}
            onClick={() => { playClick(); onTalkToVendor(vendor); }}
          />
        );
      })}

      {/* Empty village hint */}
      {(!vendors || vendors.length === 0) && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ paddingBottom: "80px", zIndex: 10 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center px-8 py-5 rounded-3xl shadow-lg"
            style={{
              background: "rgba(255,251,230,0.92)",
              border: "3px solid var(--border-game)",
            }}
          >
            <div className="text-5xl mb-3">📋</div>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Your village is empty!
            </p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--muted)" }}>
              Press the 🌿 Find Vendors button below ↓
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
