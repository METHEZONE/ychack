"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, VendorStage } from "@/lib/constants";
import { playNPCArrival } from "@/lib/sounds";
import { getSpriteSheet, SpriteSheet, SpriteFrame } from "@/lib/sprites";

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

interface VendorDoc {
  _id: string;
  companyName: string;
  characterName: string;
  animalType: string;
  stage: string;
  agentNotes?: string;
}

interface NPCProps {
  vendor: VendorDoc;
  spawnX: number; // % of container width
  spawnY: number; // % of container height
  index: number;
  isNearby?: boolean;
  isMovingIn?: boolean;
  onClick: () => void;
}

const SPEECH_BUBBLES: Record<VendorStage, string> = {
  discovered: "Nice to meet you!",
  contacted: "Got your message!",
  replied: "Here's my quote!",
  negotiating: "Let's make a deal!",
  closed: "Deal done! ⭐",
  dead: "...",
};

// How far NPCs wander from their spawn point
const WANDER_RADIUS_X = 7;  // %
const WANDER_RADIUS_Y = 3.5; // %
const MOVE_DURATION = 2.2;   // seconds
const IDLE_MIN = 2500;        // ms
const IDLE_MAX = 5000;        // ms

export function NPC({ vendor, spawnX, spawnY, index, isNearby = false, isMovingIn = false, onClick }: NPCProps) {
  const animalType = vendor.animalType as AnimalType;
  const stage = vendor.stage as VendorStage;
  const emoji = ANIMAL_EMOJI[animalType] ?? "🐾";
  const color = ANIMAL_COLORS[animalType] ?? "#888";
  const stageColor = STAGE_COLORS[stage] ?? "#888";
  const spriteSheet = getSpriteSheet(animalType);
  // Sprite display height — gomi is taller proportionally
  const SPRITE_H = animalType === "rabbit" ? 72 : 88;

  const [pos, setPos] = useState({ x: spawnX, y: spawnY });
  const [facingRight, setFacingRight] = useState(true);
  const [isWalking, setIsWalking] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [spriteFrame, setSpriteFrame] = useState(0);

  const posRef = useRef({ x: spawnX, y: spawnY });

  // Entrance jingle — staggered so multiple arrivals feel good
  useEffect(() => {
    const t = setTimeout(() => playNPCArrival(), index * 120);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Speech bubble on stage change
  useEffect(() => {
    setShowBubble(true);
    const t = setTimeout(() => setShowBubble(false), 3000);
    return () => clearTimeout(t);
  }, [stage]);

  // Sprite frame animation
  useEffect(() => {
    if (!spriteSheet) return;
    if (isWalking) {
      const iv = setInterval(() => setSpriteFrame(f => (f + 1) % 4), 155);
      return () => clearInterval(iv);
    } else {
      // idle: subtle 2-frame bob between frame 0 and 1
      const iv = setInterval(() => setSpriteFrame(f => f === 0 ? 1 : 0), 600);
      return () => clearInterval(iv);
    }
  }, [isWalking, spriteSheet]);

  // Wandering loop
  useEffect(() => {
    if (stage === "dead") return;

    let timer: ReturnType<typeof setTimeout>;

    const wander = () => {
      const idleDelay = IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);

      timer = setTimeout(() => {
        const targetX = Math.max(
          4,
          Math.min(93, spawnX + (Math.random() * 2 - 1) * WANDER_RADIUS_X)
        );
        const targetY = Math.max(
          36,
          Math.min(84, spawnY + (Math.random() * 2 - 1) * WANDER_RADIUS_Y)
        );

        const movingRight = targetX >= posRef.current.x;
        setFacingRight(movingRight);
        setIsWalking(true);
        posRef.current = { x: targetX, y: targetY };
        setPos({ x: targetX, y: targetY });

        // Stop walk animation after movement completes
        setTimeout(() => setIsWalking(false), MOVE_DURATION * 1000);

        wander();
      }, idleDelay);
    };

    // Stagger start so not all NPCs move at once
    const startDelay = setTimeout(wander, index * 600 + Math.random() * 800);
    return () => {
      clearTimeout(startDelay);
      clearTimeout(timer);
    };
  }, [spawnX, spawnY, stage, index]);

  if (stage === "dead") {
    return (
      <motion.div
        className="absolute flex flex-col items-center cursor-pointer opacity-40"
        style={{ left: `calc(${spawnX}% - 28px)`, top: `calc(${spawnY}% - 36px)`, zIndex: 20 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22, delay: index * 0.1 }}
        onClick={onClick}
      >
        <span className="text-5xl grayscale">{emoji}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-2xl mt-1 font-bold truncate max-w-[90px]"
          style={{ background: "#f1f5f9", color: "#94a3b8" }}
        >
          {vendor.characterName}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute flex flex-col items-center cursor-pointer"
      style={{ zIndex: 20 }}
      // Move-in: start from HQ center (50%, 50%), walk to spawn
      initial={isMovingIn
        ? { left: "calc(50% - 28px)", top: "calc(50% - 36px)", scale: 0, opacity: 0 }
        : { scale: 0, opacity: 0 }
      }
      animate={{
        left: `calc(${pos.x}% - 28px)`,
        top: `calc(${pos.y}% - 36px)`,
        scale: 1,
        opacity: 1,
      }}
      transition={{
        left: { duration: isMovingIn ? 2.0 : MOVE_DURATION, ease: "easeInOut", delay: isMovingIn ? 0.3 : 0 },
        top: { duration: isMovingIn ? 2.0 : MOVE_DURATION, ease: "easeInOut", delay: isMovingIn ? 0.3 : 0 },
        scale: { type: "spring", stiffness: 400, damping: 20, delay: isMovingIn ? 0.1 : index * 0.1 },
        opacity: { duration: 0.3, delay: isMovingIn ? 0.1 : index * 0.1 },
      }}
      onClick={onClick}
    >
      {/* Entrance animation wrapper */}
      <motion.div
        className="flex flex-col items-center relative"
        animate={{ scale: 1, opacity: 1 }}
        initial={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: isMovingIn ? 0.1 : index * 0.1 }}
      >
        {/* "Press E" indicator when player is nearby */}
        <AnimatePresence>
          {isNearby && !showBubble && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="absolute whitespace-nowrap text-xs px-2.5 py-1 rounded-xl shadow-md z-30 font-extrabold"
              style={{
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--accent)",
                color: "var(--text)",
                border: "2px solid var(--accent-hover)",
              }}
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
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="absolute whitespace-nowrap text-xs px-3 py-1.5 rounded-2xl shadow-md z-30"
              style={{
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--cream)",
                color: "var(--text)",
                border: "2px solid var(--border-game)",
                fontWeight: 700,
              }}
            >
              {SPEECH_BUBBLES[stage]}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "5px solid var(--border-game)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage dot */}
        <div
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white z-10"
          style={{ background: stageColor }}
        />

        {/* NPC character — sprite sheet or emoji fallback */}
        <motion.div
          whileHover={{ scale: 1.15, y: -6 }}
          className="select-none"
        >
          {spriteSheet ? (
            <SpriteDiv
              sheet={spriteSheet}
              frameIdx={spriteFrame}
              displayHeight={SPRITE_H}
              flip={!facingRight}
            />
          ) : (
            <motion.span
              key={isWalking ? "walk" : "idle"}
              animate={
                isWalking
                  ? { y: [0, -5, 0, -5, 0], scaleX: facingRight ? 1 : -1 }
                  : { y: [0, -6, 0], scaleX: facingRight ? 1 : -1 }
              }
              transition={
                isWalking
                  ? { y: { repeat: Infinity, duration: 0.38, ease: "easeInOut" }, scaleX: { duration: 0.15 } }
                  : { y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" }, scaleX: { duration: 0.15 } }
              }
              style={{ fontSize: "3.25rem", display: "inline-block" }}
            >
              {emoji}
            </motion.span>
          )}
        </motion.div>

        {/* Name badge */}
        <span
          className="text-xs px-2.5 py-1 rounded-2xl mt-1 font-extrabold truncate max-w-[100px] shadow-md"
          style={{ background: color, color: "white", border: "2px solid rgba(255,255,255,0.4)" }}
        >
          {vendor.characterName}
        </span>

        {/* Company tooltip on hover */}
        <div
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2.5 py-1 rounded-xl shadow-lg opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-none font-bold"
          style={{ background: "rgba(61,43,31,0.82)", color: "white" }}
        >
          {vendor.companyName}
        </div>
      </motion.div>
    </motion.div>
  );
}
