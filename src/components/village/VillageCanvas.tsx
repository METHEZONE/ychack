"use client";

import { useRef } from "react";
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

type VendorDoc = Doc<"vendors">;

export function VillageCanvas() {
  const userId = useForageStore((s) => s.userId);
  const setSelectedVendorId = useForageStore((s) => s.setSelectedVendorId);
  const containerRef = useRef<HTMLDivElement>(null);

  const vendors = useQuery(
    api.vendors.listByUser,
    userId ? { userId } : "skip"
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
    >
      {/* Sky band — top 32% */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "32%",
          background: "linear-gradient(180deg, #C9E8FF 0%, #87CEEB 100%)",
        }}
      >
        {/* Clouds */}
        <div
          className="cloud-float absolute"
          style={{ top: "18%", left: "8%", animationDelay: "0s" }}
        >
          <div style={{ position: "relative", width: 90, height: 36 }}>
            <div style={{ position: "absolute", top: 10, left: 0, width: 50, height: 26, background: "rgba(255,255,255,0.85)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 0, left: 18, width: 40, height: 30, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 8, left: 44, width: 36, height: 24, background: "rgba(255,255,255,0.8)", borderRadius: "50%" }} />
          </div>
        </div>
        <div
          className="cloud-float-slow absolute"
          style={{ top: "25%", left: "55%", animationDelay: "-3s" }}
        >
          <div style={{ position: "relative", width: 72, height: 28 }}>
            <div style={{ position: "absolute", top: 8, left: 0, width: 40, height: 20, background: "rgba(255,255,255,0.8)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 0, left: 14, width: 34, height: 26, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 6, left: 36, width: 28, height: 18, background: "rgba(255,255,255,0.75)", borderRadius: "50%" }} />
          </div>
        </div>
        <div
          className="cloud-float absolute"
          style={{ top: "10%", left: "75%", animationDelay: "-5s" }}
        >
          <div style={{ position: "relative", width: 60, height: 24 }}>
            <div style={{ position: "absolute", top: 6, left: 0, width: 32, height: 18, background: "rgba(255,255,255,0.85)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 0, left: 12, width: 28, height: 22, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: 5, left: 30, width: 22, height: 16, background: "rgba(255,255,255,0.8)", borderRadius: "50%" }} />
          </div>
        </div>
      </div>

      {/* Ground — bottom 70% (overlaps slightly) */}
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
        {/* HQ plaza */}
        <ellipse
          cx={HQ_X}
          cy={HQ_Y}
          rx={90}
          ry={55}
          fill="#C8935A"
          opacity={0.55}
        />
        {(vendors ?? []).map((_: VendorDoc, i: number) => {
          const offset = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
          return (
            <line
              key={i}
              x1={HQ_X}
              y1={HQ_Y}
              x2={HQ_X + offset.x}
              y2={HQ_Y + offset.y}
              stroke="#C8935A"
              strokeWidth="10"
              strokeDasharray="12,9"
              opacity={0.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* HQ building — layered CSS */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `calc(50% - 44px)`,
          top: `calc(50% - 72px)`,
          zIndex: 10,
        }}
      >
        {/* Roof triangle */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "38px solid transparent",
            borderRight: "38px solid transparent",
            borderBottom: "30px solid #e05c30",
          }}
        />
        {/* Building body */}
        <div
          style={{
            width: 68,
            height: 48,
            background: "#F5E0C0",
            border: "3px solid #C8935A",
            borderRadius: "0 0 6px 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            position: "relative",
          }}
        >
          {/* Windows */}
          <div style={{ width: 14, height: 14, background: "#87CEEB", border: "2px solid #C8935A", borderRadius: 2 }} />
          <div style={{ width: 14, height: 14, background: "#87CEEB", border: "2px solid #C8935A", borderRadius: 2 }} />
          {/* Door */}
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

      {/* Vendor NPCs — each owns its own position + wandering */}
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
            onClick={() => setSelectedVendorId(vendor._id)}
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
              Ask Forage to find vendors and they&apos;ll move in ↓
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
