"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { ANIMAL_EMOJI, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { playClick } from "@/lib/sounds";
import { Doc } from "../../../convex/_generated/dataModel";

type QuestDoc = Doc<"quests">;
type VendorDoc = Doc<"vendors">;

const STAGE_DOT: Record<VendorStage, string> = {
  discovered: "#94a3b8",
  contacted:  "#60a5fa",
  replied:    "#34d399",
  negotiating:"#fbbf24",
  closed:     "#6b9e5e",
  dead:       "#f87171",
};

export function QuestPanel() {
  const userId = useForageStore((s) => s.userId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  const quests = useQuery(api.quests.listByUser, userId ? { userId } : "skip");
  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  const allQuests = quests ?? [];
  const allVendors = vendors ?? [];

  if (collapsed) {
    return (
      <div
        className="h-full flex flex-col items-center py-3 z-20 relative"
        style={{
          width: 36,
          background: "var(--wood-header)",
          borderRight: "4px solid var(--wood-outer)",
          boxShadow: "inset -2px 0 0 var(--wood-light)",
        }}
      >
        <button
          className="pixel-btn"
          style={{ padding: "6px 8px", fontSize: 12, writingMode: "vertical-rl" }}
          onClick={() => { playClick(); setCollapsed(false); }}
        >
          <span style={{ fontSize: 12 }}>📋</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: -220 }}
      animate={{ x: 0 }}
      className="h-full flex flex-col z-20 relative pixel-scroll"
      style={{
        width: 220,
        minWidth: 220,
        background: "var(--parchment)",
        borderRight: "4px solid var(--wood-outer)",
        boxShadow: "inset -2px 0 0 var(--wood-light), 4px 0 0 var(--pixel-shadow)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="pixel-header flex items-center justify-between flex-shrink-0"
        style={{ fontSize: 8 }}
      >
        <span>📋 QUESTS & TASKS</span>
        <button
          onClick={() => { playClick(); setCollapsed(true); }}
          style={{
            background: "none",
            border: "none",
            color: "#fff5e0",
            cursor: "pointer",
            fontFamily: "var(--font-pixel), monospace",
            fontSize: 9,
            padding: "0 2px",
          }}
        >
          ◀
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pixel-scroll" style={{ padding: "8px 6px" }}>
        {allQuests.length === 0 ? (
          <div className="text-center py-6 px-3">
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
            <div
              className="font-pixel"
              style={{ fontSize: 7, color: "var(--wood-mid)", lineHeight: 1.8 }}
            >
              NO QUESTS YET.{"\n"}WALK TO HQ{"\n"}TO START!
            </div>
          </div>
        ) : (
          allQuests.map((quest: QuestDoc, qi: number) => {
            const questVendors = allVendors.filter((v: VendorDoc) => v.questId === quest._id);
            const animalEmoji = ANIMAL_EMOJI[quest.animalType as AnimalType] ?? "🗺️";
            const isExpanded = expandedQuestId === quest._id;
            const repliedCount = questVendors.filter((v) => ["replied","negotiating","closed"].includes(v.stage)).length;

            return (
              <div key={quest._id} style={{ marginBottom: 6 }}>
                {/* Quest row */}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: qi * 0.05 }}
                  className="pixel-panel-inner cursor-pointer"
                  style={{ padding: "7px 8px" }}
                  onClick={() => {
                    playClick();
                    setExpandedQuestId(isExpanded ? null : quest._id);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{animalEmoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="font-pixel"
                        style={{
                          fontSize: 6,
                          color: "var(--wood-outer)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.6,
                        }}
                      >
                        {quest.description.slice(0, 26)}{quest.description.length > 26 ? "…" : ""}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--wood-mid)",
                          fontFamily: "var(--font-nunito), sans-serif",
                          marginTop: 1,
                        }}
                      >
                        {questVendors.length} vendors
                        {repliedCount > 0 && (
                          <span style={{ color: "#34d399", marginLeft: 4 }}>· {repliedCount} replied</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        className="pixel-btn pixel-btn-green"
                        style={{ fontSize: 6, padding: "3px 6px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          playClick();
                          setActiveQuestId(quest._id);
                          router.push("/tree");
                        }}
                      >
                        TREE
                      </button>
                      <span
                        style={{
                          fontSize: 9,
                          color: "var(--wood-mid)",
                          fontFamily: "var(--font-pixel), monospace",
                        }}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Vendor list (collapsed accordion) */}
                <AnimatePresence>
                  {isExpanded && questVendors.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      {questVendors.map((vendor: VendorDoc, vi: number) => {
                        const stage = vendor.stage as VendorStage;
                        const dot = STAGE_DOT[stage] ?? "#94a3b8";
                        const label = STAGE_LABELS[stage] ?? stage;
                        return (
                          <motion.div
                            key={vendor._id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: vi * 0.03 }}
                            className="cursor-pointer"
                            style={{
                              background: "var(--parchment-dark)",
                              borderLeft: "3px solid var(--wood-mid)",
                              borderBottom: "1px solid var(--wood-mid)",
                              padding: "5px 8px 5px 12px",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                            onClick={() => {
                              playClick();
                              router.push(`/vendor/${vendor._id}`);
                            }}
                          >
                            {/* Stage dot */}
                            <div
                              style={{
                                width: 8, height: 8,
                                background: dot,
                                border: "1.5px solid var(--wood-outer)",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontFamily: "var(--font-nunito), sans-serif",
                                  fontWeight: 700,
                                  color: "var(--wood-outer)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {vendor.companyName}
                              </div>
                              <div
                                className="font-pixel"
                                style={{ fontSize: 5, color: dot, marginTop: 1 }}
                              >
                                {label.toUpperCase()}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 8,
                                color: "var(--wood-mid)",
                                fontFamily: "var(--font-pixel), monospace",
                              }}
                            >
                              →
                            </span>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: total count */}
      {allVendors.length > 0 && (
        <div
          className="flex-shrink-0 font-pixel text-center"
          style={{
            background: "var(--parchment-dark)",
            borderTop: "3px solid var(--wood-outer)",
            padding: "6px 8px",
            fontSize: 6,
            color: "var(--wood-mid)",
          }}
        >
          {allVendors.length} TOTAL VENDORS
        </div>
      )}
    </motion.div>
  );
}
