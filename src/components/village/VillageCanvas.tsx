"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { QuestNPC, QuestNPCData } from "./QuestNPC";
import {
  VILLAGE_WIDTH,
  VILLAGE_HEIGHT,
  NPC_SPAWN_OFFSETS,
} from "@/lib/constants";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { ANIMAL_EMOJI, AnimalType } from "@/lib/animals";
import { playClick, playChime } from "@/lib/sounds";
import { getSpriteSheet, SpriteSheet, SpriteFrame } from "@/lib/sprites";

// Sprite renderer (shared by player + mayor)
function SpriteDiv({ sheet, frameIdx, displayHeight, flip }: {
  sheet: SpriteSheet; frameIdx: number; displayHeight: number; flip: boolean;
}) {
  const frame: SpriteFrame = sheet.frames[frameIdx] ?? sheet.frames[0];
  const scale = displayHeight / frame.h;
  return (
    <div style={{
      width: frame.w * scale,
      height: displayHeight,
      backgroundImage: `url('${sheet.src}')`,
      backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
      backgroundSize: `${sheet.sheetW * scale}px ${sheet.sheetH * scale}px`,
      backgroundRepeat: "no-repeat",
      imageRendering: "pixelated",
      transform: flip ? "scaleX(-1)" : undefined,
      transformOrigin: "center",
      display: "inline-block",
    }} />
  );
}

const MILO_SHEET = getSpriteSheet("milo");
const GOMI_SHEET = getSpriteSheet("bear");
const MAYOR_SPAWN_X = 42;
const MAYOR_SPAWN_Y = 44;

type QuestDoc = Doc<"quests">;
type VendorDoc = Doc<"vendors">;

interface VillageCanvasProps {
  onSelectQuest: (questId: Id<"quests">) => void;
  onOpenHQ: () => void;
  onOpenGomiCollect: () => void;
  dialogueOpen: boolean;
  userName?: string;
}

const SPEED = 0.38;
const PROX_NPC_X = 11;
const PROX_NPC_Y = 8;
const HQ_PROX_X = 9;
const HQ_PROX_Y = 7;
const HQ_PCT_X = 50;
const HQ_PCT_Y = 50;

export function VillageCanvas({
  onSelectQuest,
  onOpenHQ,
  onOpenGomiCollect,
  dialogueOpen,
  userName,
}: VillageCanvasProps) {
  const userId = useForageStore((s) => s.userId);

  // Query quests + vendors to build quest NPCs with vendor counts
  const quests = useQuery(api.quests.listByUser, userId ? { userId } : "skip");
  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  // Build quest NPC data: each quest = one NPC in village
  const questNPCs: QuestNPCData[] = (quests ?? []).map((q: QuestDoc) => ({
    _id: q._id,
    description: q.description,
    animalType: q.animalType,
    characterName: q.characterName,
    vendorCount: (vendors ?? []).filter((v: VendorDoc) => v.questId === q._id).length,
    status: q.status,
  }));

  const playerRef = useRef<HTMLDivElement>(null);
  const playerShadowRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef(new Set<string>());
  const dialogueOpenRef = useRef(dialogueOpen);
  const questNPCsRef = useRef<QuestNPCData[]>([]);
  const onSelectQuestRef = useRef(onSelectQuest);
  const onOpenHQRef = useRef(onOpenHQ);
  const nearbyQuestIdRef = useRef<string | null>(null);
  const nearbyHQRef = useRef(false);
  const playerPos = useRef({ x: 50, y: 65 });
  const facingRef = useRef(1);

  const [nearbyQuestId, setNearbyQuestId] = useState<string | null>(null);
  const [nearbyHQ, setNearbyHQ] = useState(false);
  const [playerFrame, setPlayerFrame] = useState(0);
  const [playerFacing, setPlayerFacing] = useState(1);

  // Gomi Mayor state
  const nearMayorRef = useRef(false);
  const [nearMayor, setNearMayor] = useState(false);
  const onOpenGomiCollectRef = useRef(onOpenGomiCollect);

  useEffect(() => { dialogueOpenRef.current = dialogueOpen; }, [dialogueOpen]);
  useEffect(() => { questNPCsRef.current = questNPCs; }, [questNPCs]);
  useEffect(() => { onSelectQuestRef.current = onSelectQuest; }, [onSelectQuest]);
  useEffect(() => { onOpenHQRef.current = onOpenHQ; }, [onOpenHQ]);
  useEffect(() => { onOpenGomiCollectRef.current = onOpenGomiCollect; }, [onOpenGomiCollect]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.style.left = "calc(50% - 32px)";
      playerRef.current.style.top = "calc(65% - 44px)";
    }
    if (playerShadowRef.current) {
      playerShadowRef.current.style.left = "calc(50% - 16px)";
      playerShadowRef.current.style.top = "calc(65% - 5px)";
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const isWalking = playerRef.current?.classList.contains("player-walking") ?? false;
      setPlayerFrame(f => {
        if (isWalking) { const next = f + 1; return next > 4 ? 1 : next; }
        return 0;
      });
    }, 160);
    return () => clearInterval(iv);
  }, []);

  const getNpcPositions = useCallback(() =>
    questNPCsRef.current.map((_, i) => {
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

        el.style.left = `calc(${pos.x}% - 32px)`;
        el.style.top = `calc(${pos.y}% - 44px)`;
        if (shadowEl) {
          shadowEl.style.left = `calc(${pos.x}% - 16px)`;
          shadowEl.style.top = `calc(${pos.y}% - 5px)`;
        }

        if (moving !== lastWalking) {
          lastWalking = moving;
          el.classList.toggle("player-walking", moving);
        }
        if (facingRef.current !== lastFacing) {
          lastFacing = facingRef.current;
          setPlayerFacing(facingRef.current);
        }

        // Proximity checks for quest NPCs
        const npcPositions = getNpcPositions();
        let foundQuestId: string | null = null;
        npcPositions.forEach((npcPos, i) => {
          const q = questNPCsRef.current[i];
          if (!q) return;
          if (Math.abs(pos.x - npcPos.x) < PROX_NPC_X && Math.abs(pos.y - npcPos.y) < PROX_NPC_Y) {
            foundQuestId = q._id;
          }
        });
        const foundHQ = Math.abs(pos.x - HQ_PCT_X) < HQ_PROX_X && Math.abs(pos.y - HQ_PCT_Y) < HQ_PROX_Y;

        if (foundQuestId !== nearbyQuestIdRef.current) {
          nearbyQuestIdRef.current = foundQuestId;
          setNearbyQuestId(foundQuestId);
        }
        if (foundHQ !== nearbyHQRef.current) {
          nearbyHQRef.current = foundHQ;
          setNearbyHQ(foundHQ);
        }
        const foundMayor = Math.abs(pos.x - MAYOR_SPAWN_X) < PROX_NPC_X && Math.abs(pos.y - MAYOR_SPAWN_Y) < PROX_NPC_Y;
        if (foundMayor !== nearMayorRef.current) {
          nearMayorRef.current = foundMayor;
          setNearMayor(foundMayor);
        }
      }
      animFrame = requestAnimationFrame(loop);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if ((e.code === "KeyE" || e.code === "Space") && !dialogueOpenRef.current) {
        e.preventDefault();
        if (nearbyQuestIdRef.current) {
          playClick();
          onSelectQuestRef.current(nearbyQuestIdRef.current as Id<"quests">);
        } else if (nearbyHQRef.current) {
          playClick(); onOpenHQRef.current();
        } else if (nearMayorRef.current) {
          playClick(); onOpenGomiCollectRef.current();
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
      {/* Background */}
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
              className="whitespace-nowrap font-pixel shadow-lg"
              style={{ background: "var(--accent)", color: "var(--text)", border: "3px solid var(--accent-hover)", boxShadow: "0 3px 0 var(--pixel-shadow)", padding: "4px 10px", fontSize: 7 }}
            >
              💬 PRESS E
            </motion.div>
          )}
        </AnimatePresence>
        {!nearbyHQ && (
          <span className="font-pixel shadow-sm" style={{ background: "rgba(255,251,230,0.92)", color: "var(--wood-outer)", border: "2px solid var(--wood-mid)", padding: "2px 7px", fontSize: 6 }}>
            🏡 HQ
          </span>
        )}
      </div>

      {/* Player shadow */}
      <div ref={playerShadowRef} className="absolute rounded-full pointer-events-none" style={{ width: 28, height: 10, background: "rgba(0,0,0,0.18)", filter: "blur(4px)", zIndex: 19 }} />

      {/* Player character — Milo */}
      <div ref={playerRef} className="absolute flex flex-col items-center pointer-events-none select-none" style={{ zIndex: 26 }}>
        <div style={{ transform: playerFacing < 0 ? "scaleX(-1)" : undefined, display: "inline-block" }}>
          {MILO_SHEET ? (
            <SpriteDiv sheet={MILO_SHEET} frameIdx={playerFrame} displayHeight={88} flip={false} />
          ) : (
            <span style={{ fontSize: "2.4rem" }}>🙂</span>
          )}
        </div>
        {/* Player name tag */}
        <span
          className="font-pixel truncate mt-1"
          style={{
            background: "var(--primary)",
            color: "white",
            border: "3px solid rgba(0,0,0,0.25)",
            boxShadow: "0 3px 0 rgba(0,0,0,0.3)",
            padding: "3px 8px",
            fontSize: 7,
            display: "inline-block",
            maxWidth: 110,
          }}
        >
          {(userName || "MILO").toUpperCase()}
        </span>
        {(nearbyQuestId || nearbyHQ || nearMayor) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="absolute whitespace-nowrap font-pixel shadow-md"
            style={{ bottom: "calc(100% + 2px)", left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "var(--text)", border: "3px solid var(--accent-hover)", boxShadow: "0 3px 0 var(--pixel-shadow)", padding: "4px 10px", fontSize: 7 }}
          >
            💬 E
          </motion.div>
        )}
      </div>

      {/* Quest NPCs — one animal per quest */}
      {questNPCs.map((quest, i) => {
        const offset = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
        const spawnX = 50 + (offset.x / VILLAGE_WIDTH) * 100;
        const spawnY = 50 + (offset.y / VILLAGE_HEIGHT) * 100;
        return (
          <QuestNPC
            key={quest._id}
            quest={quest}
            spawnX={spawnX}
            spawnY={spawnY}
            index={i}
            isNearby={nearbyQuestId === quest._id}
            onClick={() => { playClick(); onSelectQuest(quest._id as Id<"quests">); }}
          />
        );
      })}

      {/* Gomi Mayor */}
      <motion.div
        className="absolute flex flex-col items-center cursor-pointer"
        style={{ left: `calc(${MAYOR_SPAWN_X}% - 28px)`, top: `calc(${MAYOR_SPAWN_Y}% - 44px)`, zIndex: 22 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.5 }}
        onClick={() => { playClick(); onOpenGomiCollectRef.current(); }}
      >
        <AnimatePresence>
          {nearMayor && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="absolute whitespace-nowrap font-pixel shadow-md"
              style={{ bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "var(--text)", border: "3px solid var(--accent-hover)", boxShadow: "0 3px 0 var(--pixel-shadow)", padding: "4px 10px", fontSize: 7, zIndex: 30 }}
            >
              💬 E
            </motion.div>
          )}
        </AnimatePresence>
        {GOMI_SHEET ? (
          <SpriteDiv sheet={GOMI_SHEET} frameIdx={0} displayHeight={80} flip={false} />
        ) : (
          <span style={{ fontSize: "2.8rem" }}>🐻</span>
        )}
        <span className="font-pixel mt-1"
          style={{ background: "#5BAD4E", color: "white", border: "3px solid #3d8a35", boxShadow: "0 3px 0 #1e4d1a", padding: "3px 8px", fontSize: 7, display: "inline-block" }}>
          GOMI
        </span>
      </motion.div>

      {/* Empty village hint */}
      {questNPCs.length === 0 && !dialogueOpen && (
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
