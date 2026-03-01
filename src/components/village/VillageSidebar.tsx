"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";

type VendorDoc = Doc<"vendors">;

export function VillageSidebar() {
  const userId = useForageStore((s) => s.userId);
  const sidebarOpen = useForageStore((s) => s.sidebarOpen);
  const toggleSidebar = useForageStore((s) => s.toggleSidebar);
  const setSelectedVendorId = useForageStore((s) => s.setSelectedVendorId);
  const router = useRouter();

  const vendors = useQuery(
    api.vendors.listByUser,
    userId ? { userId } : "skip"
  );

  return (
    <div
      className="flex flex-col h-full transition-all duration-300 border-l-4"
      style={{
        width: sidebarOpen ? 248 : 0,
        minWidth: sidebarOpen ? 248 : 0,
        overflow: "hidden",
        background: "var(--cream)",
        borderColor: "var(--border-game)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b-2 font-extrabold text-sm flex-shrink-0"
        style={{ borderColor: "var(--border-game)", background: "var(--primary)", color: "white" }}
      >
        <span>🏘️ Villagers ({vendors?.length ?? 0})</span>
        <button
          onClick={toggleSidebar}
          className="text-xl leading-none opacity-80 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>

      {/* NPC list */}
      <div className="flex-1 overflow-y-auto scrollable">
        {!vendors || vendors.length === 0 ? (
          <div className="p-4 text-xs text-center font-semibold" style={{ color: "var(--muted)" }}>
            No vendors yet.
            <br />
            Ask Forage to start foraging!
          </div>
        ) : (
          vendors.map((vendor: VendorDoc, i: number) => {
            const emoji = ANIMAL_EMOJI[vendor.animalType as AnimalType] ?? "🐾";
            const color = ANIMAL_COLORS[vendor.animalType as AnimalType] ?? "#888";
            const stage = vendor.stage as VendorStage;
            const stageColor = STAGE_COLORS[stage];
            return (
              <motion.button
                key={vendor._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b-2"
                style={{
                  borderColor: "rgba(140,200,112,0.3)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                onClick={() => {
                  setSelectedVendorId(vendor._id);
                  router.push(`/vendor/${vendor._id}`);
                }}
              >
                <span
                  className="text-2xl w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 shadow-sm"
                  style={{ background: color + "30", border: `2px solid ${color}55` }}
                >
                  {emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-extrabold truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {vendor.characterName}
                  </div>
                  <div
                    className="text-xs truncate font-semibold"
                    style={{ color: "var(--muted)" }}
                  >
                    {vendor.companyName}
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                  style={{ background: stageColor + "25", color: stageColor, border: `1.5px solid ${stageColor}55` }}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
