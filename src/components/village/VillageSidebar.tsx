"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { DataModel } from "../../../convex/_generated/dataModel";

type VendorDoc = DataModel["vendors"];

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
      className="flex flex-col h-full transition-all duration-300 border-l"
      style={{
        width: sidebarOpen ? 240 : 0,
        minWidth: sidebarOpen ? 240 : 0,
        overflow: "hidden",
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b font-semibold text-sm"
        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        <span>🏘️ Villagers ({vendors?.length ?? 0})</span>
        <button
          onClick={toggleSidebar}
          className="text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      </div>

      {/* NPC list */}
      <div className="flex-1 overflow-y-auto scrollable">
        {!vendors || vendors.length === 0 ? (
          <div className="p-4 text-xs text-center" style={{ color: "var(--muted)" }}>
            No vendors yet.
            <br />
            Ask Forage to start foraging!
          </div>
        ) : (
          vendors.map((vendor: VendorDoc) => {
            const emoji = ANIMAL_EMOJI[vendor.animalType as AnimalType] ?? "🐾";
            const color = ANIMAL_COLORS[vendor.animalType as AnimalType] ?? "#888";
            const stage = vendor.stage as VendorStage;
            const stageColor = STAGE_COLORS[stage];
            return (
              <button
                key={vendor._id}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors border-b"
                style={{ borderColor: "var(--border)" }}
                onClick={() => {
                  setSelectedVendorId(vendor._id);
                  router.push(`/vendor/${vendor._id}`);
                }}
              >
                <span
                  className="text-2xl w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ background: color + "20" }}
                >
                  {emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {vendor.characterName}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: "var(--muted)" }}
                  >
                    {vendor.companyName}
                  </div>
                </div>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ background: stageColor + "20", color: stageColor }}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
