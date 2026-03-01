"use client";

import { useEffect, useRef, useState } from "react";
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
import { DataModel } from "../../../convex/_generated/dataModel";

type VendorDoc = DataModel["vendors"];

// NOTE: PixiJS full integration will be added in a later pass.
// For now this renders an HTML Canvas with CSS animations for demo speed.

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
      style={{
        background:
          "radial-gradient(ellipse at 50% 60%, #7ab85c 0%, #5a9e40 40%, #3a7e28 100%)",
      }}
    >
      {/* Ground grid / grass texture */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,0.1) 39px, rgba(0,0,0,0.1) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,0,0,0.1) 39px, rgba(0,0,0,0.1) 40px)",
        }}
      />

      {/* Dirt paths */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        viewBox={`0 0 ${VILLAGE_WIDTH} ${VILLAGE_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <ellipse
          cx={HQ_X}
          cy={HQ_Y}
          rx={80}
          ry={50}
          fill="#c4a060"
          opacity={0.6}
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
              stroke="#c4a060"
              strokeWidth="8"
              strokeDasharray="10,8"
              opacity={0.4}
            />
          );
        })}
      </svg>

      {/* HQ building */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `calc(50% - 40px)`,
          top: `calc(50% - 60px)`,
        }}
      >
        <div className="text-5xl mb-1" title="Your HQ">
          🏠
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.8)",
            color: "var(--foreground)",
          }}
        >
          HQ
        </span>
      </div>

      {/* Trees (decorative) */}
      {[
        { x: "10%", y: "15%" },
        { x: "85%", y: "10%" },
        { x: "5%", y: "70%" },
        { x: "88%", y: "75%" },
        { x: "45%", y: "5%" },
        { x: "50%", y: "88%" },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute text-3xl select-none pointer-events-none"
          style={{ left: pos.x, top: pos.y }}
        >
          🌲
        </div>
      ))}

      {/* Vendor NPCs */}
      {(vendors ?? []).map((vendor: VendorDoc, i: number) => {
        const offset = NPC_SPAWN_OFFSETS[i % NPC_SPAWN_OFFSETS.length];
        const x = 50 + (offset.x / VILLAGE_WIDTH) * 100;
        const y = 50 + (offset.y / VILLAGE_HEIGHT) * 100;
        return (
          <NPC
            key={vendor._id}
            vendor={vendor}
            style={{
              left: `calc(${x}% - 24px)`,
              top: `calc(${y}% - 32px)`,
            }}
            onClick={() => setSelectedVendorId(vendor._id)}
          />
        );
      })}

      {/* Empty village hint */}
      {(!vendors || vendors.length === 0) && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ paddingBottom: "80px" }}
        >
          <div
            className="text-center px-6 py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.75)" }}
          >
            <div className="text-4xl mb-2">🌿</div>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Your village is empty.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Ask Forage to find vendors and they&apos;ll move in!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
