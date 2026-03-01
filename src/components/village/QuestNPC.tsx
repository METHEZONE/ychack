"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { playNPCArrival } from "@/lib/sounds";
import { getSpriteSheet, SpriteFrame } from "@/lib/sprites";

function SpriteDiv({ sheet, frameIdx, displayHeight, flip }: {
  sheet: { src: string; frames: SpriteFrame[]; sheetW: number; sheetH: number };
  frameIdx: number; displayHeight: number; flip: boolean;
}) {
  const frame = sheet.frames[frameIdx] ?? sheet.frames[0];
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

export interface QuestNPCData {
  _id: string;
  description: string;
  animalType?: string;
  characterName?: string;
  vendorCount: number;
  status: string;
}

interface QuestNPCProps {
  quest: QuestNPCData;
  spawnX: number;
  spawnY: number;
  index: number;
  isNearby?: boolean;
  onClick: () => void;
}

const WANDER_RADIUS_X = 7;
const WANDER_RADIUS_Y = 3.5;
const MOVE_DURATION = 2.2;
const IDLE_MIN = 2500;
const IDLE_MAX = 5000;

const QUEST_BUBBLES = [
  "Working on it!",
  "Found some leads!",
  "Making progress...",
  "Let me show you!",
];

export function QuestNPC({ quest, spawnX, spawnY, index, isNearby = false, onClick }: QuestNPCProps) {
  const animalType = (quest.animalType ?? "fox") as AnimalType;
  const emoji = ANIMAL_EMOJI[animalType] ?? "🐾";
  const color = ANIMAL_COLORS[animalType] ?? "#888";
  const spriteSheet = getSpriteSheet(animalType);
  const SPRITE_H = animalType === "rabbit" ? 72 : animalType === "deer" ? 80 : 88;
  const WALK_FRAME_START = animalType === "lion" ? 1 : 0;

  const [pos, setPos] = useState({ x: spawnX, y: spawnY });
  const [facingRight, setFacingRight] = useState(true);
  const [isWalking, setIsWalking] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [spriteFrame, setSpriteFrame] = useState(0);

  const posRef = useRef({ x: spawnX, y: spawnY });

  useEffect(() => {
    const t = setTimeout(() => playNPCArrival(), index * 120);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Random speech bubble on mount
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 1000 + index * 500);
    const t2 = setTimeout(() => setShowBubble(false), 4000 + index * 500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sprite frame animation
  useEffect(() => {
    if (!spriteSheet) return;
    if (isWalking) {
      const iv = setInterval(() => setSpriteFrame(f => {
        const next = f + 1;
        return next >= WALK_FRAME_START + 4 ? WALK_FRAME_START : next;
      }), 155);
      setSpriteFrame(WALK_FRAME_START);
      return () => clearInterval(iv);
    } else {
      const iv = setInterval(() => setSpriteFrame(f =>
        f === WALK_FRAME_START ? WALK_FRAME_START + 1 : WALK_FRAME_START
      ), 600);
      setSpriteFrame(WALK_FRAME_START);
      return () => clearInterval(iv);
    }
  }, [isWalking, spriteSheet, WALK_FRAME_START]);

  // Wandering loop
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wander = () => {
      const idleDelay = IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
      timer = setTimeout(() => {
        const targetX = Math.max(4, Math.min(93, spawnX + (Math.random() * 2 - 1) * WANDER_RADIUS_X));
        const targetY = Math.max(36, Math.min(84, spawnY + (Math.random() * 2 - 1) * WANDER_RADIUS_Y));
        setFacingRight(targetX >= posRef.current.x);
        setIsWalking(true);
        posRef.current = { x: targetX, y: targetY };
        setPos({ x: targetX, y: targetY });
        setTimeout(() => setIsWalking(false), MOVE_DURATION * 1000);
        wander();
      }, idleDelay);
    };
    const startDelay = setTimeout(wander, index * 600 + Math.random() * 800);
    return () => { clearTimeout(startDelay); clearTimeout(timer); };
  }, [spawnX, spawnY, index]);

  const bubbleText = QUEST_BUBBLES[index % QUEST_BUBBLES.length];

  return (
    <motion.div
      className="absolute flex flex-col items-center cursor-pointer"
      style={{ zIndex: 20 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        left: `calc(${pos.x}% - 28px)`,
        top: `calc(${pos.y}% - 36px)`,
        scale: 1,
        opacity: 1,
      }}
      transition={{
        left: { duration: MOVE_DURATION, ease: "easeInOut" },
        top: { duration: MOVE_DURATION, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 400, damping: 20, delay: index * 0.1 },
        opacity: { duration: 0.3, delay: index * 0.1 },
      }}
      onClick={onClick}
    >
      <motion.div
        className="flex flex-col items-center relative"
        animate={{ scale: 1, opacity: 1 }}
        initial={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: index * 0.1 }}
      >
        {/* "Press E" indicator */}
        <AnimatePresence>
          {isNearby && !showBubble && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.85 }}
              className="absolute whitespace-nowrap text-xs px-2.5 py-1 rounded-xl shadow-md z-30 font-extrabold"
              style={{ bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "var(--text)", border: "2px solid var(--accent-hover)" }}
            >
              💬 E
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speech bubble */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.85 }}
              className="absolute whitespace-nowrap text-xs px-3 py-1.5 rounded-2xl shadow-md z-30"
              style={{ bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "var(--cream)", color: "var(--text)", border: "2px solid var(--border-game)", fontWeight: 700 }}
            >
              {bubbleText}
              <div className="absolute top-full left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--border-game)" }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vendor count badge */}
        {quest.vendorCount > 0 && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold border-2 border-white z-10"
            style={{ background: "var(--primary)", color: "white" }}
          >
            {quest.vendorCount}
          </div>
        )}

        {/* NPC character */}
        <motion.div whileHover={{ scale: 1.15, y: -6 }} className="select-none">
          {spriteSheet ? (
            <SpriteDiv sheet={spriteSheet} frameIdx={spriteFrame} displayHeight={SPRITE_H} flip={!facingRight} />
          ) : (
            <motion.span
              key={isWalking ? "walk" : "idle"}
              animate={isWalking ? { y: [0, -5, 0, -5, 0], scaleX: facingRight ? 1 : -1 } : { y: [0, -6, 0], scaleX: facingRight ? 1 : -1 }}
              transition={isWalking ? { y: { repeat: Infinity, duration: 0.38 }, scaleX: { duration: 0.15 } } : { y: { repeat: Infinity, duration: 2.2 }, scaleX: { duration: 0.15 } }}
              style={{ fontSize: "3.25rem", display: "inline-block" }}
            >
              {emoji}
            </motion.span>
          )}
        </motion.div>

        {/* Name + quest label */}
        <span
          className="text-xs px-2.5 py-1 rounded-2xl mt-1 font-extrabold truncate max-w-[120px] shadow-md"
          style={{ background: color, color: "white", border: "2px solid rgba(255,255,255,0.4)" }}
        >
          {quest.characterName ?? "Agent"}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-xl mt-0.5 font-bold truncate max-w-[120px]"
          style={{ background: "rgba(255,255,255,0.85)", color: "var(--text)", border: "1.5px solid var(--border-game)" }}
        >
          {quest.description.length > 20 ? quest.description.slice(0, 18) + "..." : quest.description}
        </span>
      </motion.div>
    </motion.div>
  );
}
