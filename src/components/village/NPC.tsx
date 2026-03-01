"use client";

import { CSSProperties, useState, useEffect } from "react";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, VendorStage } from "@/lib/constants";

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
  style: CSSProperties;
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

export function NPC({ vendor, style, onClick }: NPCProps) {
  const animalType = vendor.animalType as AnimalType;
  const stage = vendor.stage as VendorStage;
  const emoji = ANIMAL_EMOJI[animalType] ?? "🐾";
  const color = ANIMAL_COLORS[animalType] ?? "#888";
  const stageColor = STAGE_COLORS[stage] ?? "#888";

  const [bobOffset, setBobOffset] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  // Idle bob animation
  useEffect(() => {
    let t = Math.random() * Math.PI * 2; // random phase
    const interval = setInterval(() => {
      t += 0.08;
      setBobOffset(Math.sin(t) * 3);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Show speech bubble on stage change
  useEffect(() => {
    setShowBubble(true);
    const timeout = setTimeout(() => setShowBubble(false), 3000);
    return () => clearTimeout(timeout);
  }, [stage]);

  if (stage === "dead") {
    return (
      <div
        className="absolute flex flex-col items-center cursor-pointer opacity-40"
        style={style}
        onClick={onClick}
      >
        <span className="text-4xl grayscale">{emoji}</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full mt-1 font-medium truncate max-w-[80px]"
          style={{ background: "#f1f5f9", color: "#94a3b8" }}
        >
          {vendor.characterName}
        </span>
      </div>
    );
  }

  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer group"
      style={style}
      onClick={onClick}
    >
      {/* Speech bubble */}
      {showBubble && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2 py-1 rounded-lg shadow-sm z-10"
          style={{
            background: "white",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        >
          {SPEECH_BUBBLES[stage]}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid white",
            }}
          />
        </div>
      )}

      {/* Stage dot */}
      <div
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
        style={{ background: stageColor }}
      />

      {/* NPC emoji with bob animation */}
      <div
        className="text-4xl select-none transition-transform group-hover:scale-110"
        style={{ transform: `translateY(${bobOffset}px)` }}
      >
        {emoji}
      </div>

      {/* Name badge */}
      <span
        className="text-xs px-2 py-0.5 rounded-full mt-1 font-bold truncate max-w-[90px] shadow-sm"
        style={{ background: color, color: "white" }}
      >
        {vendor.characterName}
      </span>

      {/* Company name on hover */}
      <div
        className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.75)", color: "white" }}
      >
        {vendor.companyName}
      </div>
    </div>
  );
}
