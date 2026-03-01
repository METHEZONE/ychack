"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useForageStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { playClick, playChime } from "@/lib/sounds";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STAGE_LABELS, VendorStage } from "@/lib/constants";
import { ANIMAL_EMOJI, AnimalType } from "@/lib/animals";

type QuestDoc = Doc<"quests">;
type VendorDoc = Doc<"vendors">;

type ViewMode = "tree" | "compare" | "recommend";

// Earthy root colors — warmer, more organic than raw stage colors
const ROOT_STAGE_COLORS: Record<VendorStage, string> = {
  discovered: "#b8956a",  // warm tan/bark
  contacted:  "#6aafd4",  // muted sky
  replied:    "#5abf7a",  // forest green
  negotiating:"#d4a832",  // warm gold
  closed:     "#68a850",  // deep forest
  dead:       "#b06868",  // warm rust
};

const QUEST_BOTTOM_Y = 120;
const VENDOR_TOP_Y = 290;

function rootPath(questCX: number, vx: number): string {
  const midY = (QUEST_BOTTOM_Y + VENDOR_TOP_Y) / 2;
  return `M ${questCX},${QUEST_BOTTOM_Y} C ${questCX},${midY} ${vx},${midY} ${vx},${VENDOR_TOP_Y}`;
}

export function DecisionTree() {
  const router = useRouter();
  const userId = useForageStore((s) => s.userId);
  const activeQuestId = useForageStore((s) => s.activeQuestId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);

  const quests = useQuery(api.quests.listByUser, userId ? { userId } : "skip");
  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  const removeQuest = useMutation(api.quests.remove);
  const removeVendor = useMutation(api.vendors.remove);
  const getRecommendation = useAction(api.actions.claude.recommendBestVendor);

  const [confirmDeleteQuest, setConfirmDeleteQuest] = useState<Id<"quests"> | null>(null);
  const [confirmDeleteVendor, setConfirmDeleteVendor] = useState<Id<"vendors"> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [recommendedVendorId, setRecommendedVendorId] = useState<string | null>(null);
  const [recommendReason, setRecommendReason] = useState<string | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!quests || quests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center pixel-panel p-8">
          <div className="text-5xl mb-3">🗺️</div>
          <div className="font-pixel text-center" style={{ fontSize: 8, color: "var(--wood-outer)", lineHeight: 2 }}>
            NO QUESTS YET.{"\n"}WALK TO HQ TO START!
          </div>
        </div>
      </div>
    );
  }

  const resolvedQuestId = activeQuestId && quests.find((q: QuestDoc) => q._id === activeQuestId)
    ? activeQuestId
    : quests[0]._id;

  const activeQuest = quests.find((q: QuestDoc) => q._id === resolvedQuestId) ?? quests[0];

  const questVendors = (vendors ?? []).filter(
    (v: VendorDoc) => v.questId === resolvedQuestId
  );

  const vendorsWithQuotes = questVendors.filter((v: VendorDoc) => v.quote?.price || v.quote?.moq || v.quote?.leadTime);

  async function handleRecommend() {
    if (questVendors.length === 0) return;
    setLoadingRec(true);
    setViewMode("recommend");
    try {
      const result = await getRecommendation({
        vendors: questVendors.map((v: VendorDoc) => ({
          vendorId: v._id,
          companyName: v.companyName,
          stage: v.stage,
          quote: v.quote ?? undefined,
          agentNotes: v.agentNotes ?? undefined,
          location: v.location ?? undefined,
        })),
        questDescription: activeQuest.description,
      });
      if (result?.vendorId) {
        setRecommendedVendorId(result.vendorId);
        setRecommendReason(result.reason);
        playChime();
      } else {
        setRecommendReason(result?.reason ?? "Not enough data yet.");
      }
    } catch {
      setRecommendReason("Couldn't get recommendation — try again.");
    } finally {
      setLoadingRec(false);
    }
  }

  // Vendor x positions
  const spacing = containerW / (questVendors.length + 1);
  const vendorXs = questVendors.map((_: VendorDoc, i: number) => spacing * (i + 1));
  const questCX = containerW / 2;

  return (
    <div className="h-full overflow-auto scrollable" style={{ padding: "16px 16px 20px", background: "var(--parchment)" }}>

      {/* ── Quest selector (woody pixel buttons) ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {quests.map((quest: QuestDoc) => (
          <div key={quest._id} className="relative group">
            <button
              onClick={() => { playClick(); setActiveQuestId(quest._id); }}
              className={`pixel-btn ${quest._id === resolvedQuestId ? "pixel-btn-green" : ""}`}
              style={{ fontSize: 7, padding: "7px 14px" }}
            >
              {ANIMAL_EMOJI[quest.animalType as AnimalType] ?? "🗺️"} {quest.description.slice(0, 22)}{quest.description.length > 22 ? "…" : ""}
            </button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); playClick(); setConfirmDeleteQuest(quest._id); }}
              className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "#ef4444", color: "white", border: "2px solid #dc2626" }}
            >
              ✕
            </motion.button>
          </div>
        ))}
      </div>

      {/* ── View mode tabs (woody pixel buttons) ── */}
      {questVendors.length > 0 && (
        <div className="flex items-center gap-2 mb-5">
          {(["tree", "compare", "recommend"] as ViewMode[]).map((mode) => (
            <motion.button
              key={mode}
              whileTap={{ scale: 0.93 }}
              onClick={() => { playClick(); setViewMode(mode); if (mode === "recommend" && !recommendedVendorId) handleRecommend(); }}
              className={`pixel-btn ${viewMode === mode ? "pixel-btn-accent" : ""}`}
              style={{ fontSize: 7, padding: "6px 12px" }}
            >
              {mode === "tree" ? "🌳 TREE" : mode === "compare" ? "📊 COMPARE" : "⭐ PICK BEST"}
            </motion.button>
          ))}
        </div>
      )}

      {/* ── COMPARE VIEW ─────────────────────────────────────────────── */}
      {viewMode === "compare" && questVendors.length > 0 && (
        <div className="overflow-x-auto mb-6 pixel-panel">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--wood-header)", color: "#fff5e0" }}>
                <th className="px-3 py-2.5 text-left font-pixel" style={{ fontSize: 6 }}>VENDOR</th>
                <th className="px-3 py-2.5 text-center font-pixel" style={{ fontSize: 6 }}>STAGE</th>
                <th className="px-3 py-2.5 text-center font-pixel" style={{ fontSize: 6 }}>💰 PRICE</th>
                <th className="px-3 py-2.5 text-center font-pixel" style={{ fontSize: 6 }}>📦 MOQ</th>
                <th className="px-3 py-2.5 text-center font-pixel" style={{ fontSize: 6 }}>⏱ LEAD</th>
                <th className="px-3 py-2.5 text-center font-pixel" style={{ fontSize: 6 }}>NOTES</th>
              </tr>
            </thead>
            <tbody>
              {questVendors.map((v: VendorDoc, i: number) => {
                const rootColor = ROOT_STAGE_COLORS[v.stage as VendorStage] ?? "#888";
                const stageLabel = STAGE_LABELS[v.stage as VendorStage] ?? v.stage;
                const isRec = v._id === recommendedVendorId;
                return (
                  <tr
                    key={v._id}
                    onClick={() => { playClick(); router.push(`/vendor/${v._id}`); }}
                    className="cursor-pointer"
                    style={{
                      background: isRec ? "rgba(212,168,50,0.12)" : i % 2 === 0 ? "var(--parchment)" : "var(--parchment-dark)",
                      borderBottom: "2px solid var(--wood-mid)",
                    }}
                  >
                    <td className="px-3 py-2 font-extrabold" style={{ color: "var(--wood-outer)" }}>
                      {isRec && <span className="mr-1">⭐</span>}
                      {v.companyName}
                      {v.location && <div className="text-xs font-normal opacity-60">{v.location}</div>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-pixel" style={{ fontSize: 5, color: rootColor }}>{stageLabel.toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-2 text-center font-bold" style={{ color: "var(--wood-outer)" }}>
                      {v.quote?.price ?? <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-bold" style={{ color: "var(--wood-outer)" }}>
                      {v.quote?.moq ?? <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-bold" style={{ color: "var(--wood-outer)" }}>
                      {v.quote?.leadTime ?? <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-3 py-2 max-w-[180px]" style={{ color: "var(--wood-mid)", fontSize: 10 }}>
                      {v.agentNotes ? v.agentNotes.slice(0, 80) + (v.agentNotes.length > 80 ? "…" : "") : <span className="opacity-30">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {vendorsWithQuotes.length === 0 && (
            <div className="text-center py-4 font-pixel" style={{ fontSize: 6, color: "var(--wood-mid)" }}>
              NO QUOTES YET
            </div>
          )}
        </div>
      )}

      {/* ── RECOMMEND VIEW ───────────────────────────────────────────── */}
      {viewMode === "recommend" && (
        <AnimatePresence>
          {loadingRec ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="text-3xl">🌿</motion.div>
              <div className="font-pixel text-center" style={{ fontSize: 7, color: "var(--wood-mid)" }}>PICKING BEST VENDOR...</div>
            </motion.div>
          ) : recommendReason ? (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="pixel-panel px-5 py-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">⭐</div>
                <div>
                  {recommendedVendorId && (
                    <div className="font-pixel mb-2" style={{ fontSize: 7, color: "var(--wood-outer)" }}>
                      BEST PICK: {questVendors.find((v: VendorDoc) => v._id === recommendedVendorId)?.companyName ?? "a vendor"}
                    </div>
                  )}
                  <div className="text-xs font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
                    {recommendReason}
                  </div>
                  {recommendedVendorId && (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { playClick(); router.push(`/vendor/${recommendedVendorId}`); }}
                      className="pixel-btn pixel-btn-green mt-3"
                      style={{ fontSize: 7, padding: "6px 14px" }}
                    >
                      VIEW VENDOR →
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {/* ── TREE VIEW — Roots growing downward ───────────────────────── */}
      {viewMode === "tree" && (
        <div
          ref={containerRef}
          style={{
            position: "relative",
            background: "#1a0e05",
            minHeight: VENDOR_TOP_Y + 200,
            border: "4px solid var(--wood-outer)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), 4px 4px 0 var(--pixel-shadow)",
          }}
        >
          {/* Color legend — top right */}
          <div style={{ position: "absolute", top: 10, right: 10, zIndex: 5 }}>
            <div style={{
              background: "rgba(26,14,5,0.92)",
              border: "3px solid var(--wood-mid)",
              boxShadow: "inset 0 0 0 1px var(--wood-light), 3px 3px 0 var(--pixel-shadow)",
              padding: "8px 10px",
            }}>
              <div className="font-pixel" style={{ fontSize: 6, color: "#c8a870", marginBottom: 7, letterSpacing: "0.06em" }}>
                STAGE KEY
              </div>
              {(Object.entries(ROOT_STAGE_COLORS) as [VendorStage, string][]).map(([stage, color]) => (
                <div key={stage} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <div style={{
                    width: 10, height: 10, background: color,
                    border: "1.5px solid rgba(255,255,255,0.25)",
                    boxShadow: `0 0 4px ${color}88`,
                    flexShrink: 0,
                  }} />
                  <span className="font-pixel" style={{ fontSize: 5, color: "#c8a870", letterSpacing: "0.04em" }}>
                    {STAGE_LABELS[stage].toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SVG roots */}
          {questVendors.length > 0 && (
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: VENDOR_TOP_Y + 20,
                pointerEvents: "none",
              }}
              aria-hidden
            >
              <defs>
                {questVendors.map((_: VendorDoc, i: number) => (
                  <path key={i} id={`rootpath-${i}`} d={rootPath(questCX, vendorXs[i])} />
                ))}
              </defs>

              {questVendors.map((v: VendorDoc, i: number) => {
                const color = ROOT_STAGE_COLORS[v.stage as VendorStage] ?? "#b8956a";
                return (
                  <g key={v._id}>
                    {/* Outer bark shadow */}
                    <path d={rootPath(questCX, vendorXs[i])} fill="none" stroke="#0d0702" strokeWidth={8} />
                    {/* Bark texture */}
                    <path d={rootPath(questCX, vendorXs[i])} fill="none" stroke="#4a2c14" strokeWidth={5} />
                    {/* Stage-colored glow root */}
                    <path
                      d={rootPath(questCX, vendorXs[i])}
                      fill="none"
                      stroke={color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: 600,
                        strokeDashoffset: 600,
                        animation: `drawRoot 1.2s ease forwards ${i * 0.2 + 0.3}s`,
                        filter: `drop-shadow(0 0 6px ${color})`,
                      }}
                    />
                    {/* Energy pulse orb flowing DOWN */}
                    <circle r={6} fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})`, opacity: 0.9 }}>
                      <animateMotion
                        dur={`${2.0 + i * 0.22}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.2 + 1.8}s`}
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      >
                        <mpath href={`#rootpath-${i}`} />
                      </animateMotion>
                    </circle>
                    {/* Trailing glow orb */}
                    <circle r={3} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})`, opacity: 0.5 }}>
                      <animateMotion
                        dur={`${2.0 + i * 0.22}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.2 + 2.0}s`}
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      >
                        <mpath href={`#rootpath-${i}`} />
                      </animateMotion>
                    </circle>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Quest node (top center) */}
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 2 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="pixel-panel flex flex-col items-center gap-2 px-4 py-3"
              style={{ minWidth: 160, background: "var(--parchment)" }}
            >
              <span style={{ fontSize: 36 }}>
                {ANIMAL_EMOJI[activeQuest.animalType as AnimalType] ?? "🗺️"}
              </span>
              <div
                className="font-pixel text-center"
                style={{ fontSize: 6, color: "var(--wood-outer)", maxWidth: 150, lineHeight: 1.8 }}
              >
                {activeQuest.description.slice(0, 30)}{activeQuest.description.length > 30 ? "…" : ""}
              </div>
            </motion.div>
          </div>

          {/* Vendor nodes (bottom row) */}
          {questVendors.map((vendor: VendorDoc, i: number) => {
            const color = ROOT_STAGE_COLORS[vendor.stage as VendorStage] ?? "#b8956a";
            return (
              <motion.div
                key={vendor._id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 450, damping: 22, delay: i * 0.2 + 1.0 }}
                style={{
                  position: "absolute",
                  top: VENDOR_TOP_Y,
                  left: vendorXs[i] - 64,
                  width: 128,
                  cursor: "pointer",
                  zIndex: 2,
                }}
                className="pixel-panel group"
                onClick={() => { playClick(); router.push(`/vendor/${vendor._id}`); }}
              >
                {/* Stage color stripe */}
                <div style={{ height: 4, background: color, boxShadow: `0 0 8px ${color}` }} />
                <div className="p-2 text-center">
                  <div
                    className="font-pixel"
                    style={{ fontSize: 5, color: "var(--wood-outer)", lineHeight: 1.8 }}
                  >
                    {vendor.companyName.slice(0, 14)}{vendor.companyName.length > 14 ? "…" : ""}
                  </div>
                  <div
                    className="font-pixel"
                    style={{ fontSize: 5, color, marginTop: 3 }}
                  >
                    {(STAGE_LABELS[vendor.stage as VendorStage] ?? vendor.stage).toUpperCase()}
                  </div>
                </div>
                {/* Delete X on hover */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); playClick(); setConfirmDeleteVendor(vendor._id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "#ef4444", color: "white", border: "2px solid #dc2626" }}
                >
                  ✕
                </motion.button>
              </motion.div>
            );
          })}

          {/* Empty state */}
          {questVendors.length === 0 && (
            <div style={{
              position: "absolute",
              top: VENDOR_TOP_Y + 20,
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
            }}>
              <div className="font-pixel" style={{ fontSize: 7, color: "#7a5a3a", lineHeight: 2 }}>
                NO VENDORS YET.{"\n"}WALK TO HQ TO FIND SOME!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete quest modal */}
      <AnimatePresence>
        {confirmDeleteQuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setConfirmDeleteQuest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="pixel-panel p-6 max-w-sm w-full mx-4"
            >
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🗑️</div>
                <div className="font-pixel" style={{ fontSize: 7, color: "var(--wood-outer)" }}>DELETE THIS QUEST?</div>
                <p className="text-xs font-semibold mt-2" style={{ color: "var(--muted)" }}>
                  This will also delete all vendors in this quest.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmDeleteQuest(null)}
                  className="flex-1 pixel-btn"
                  style={{ fontSize: 7, padding: "8px" }}
                >
                  CANCEL
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={async () => {
                    playClick();
                    await removeQuest({ questId: confirmDeleteQuest });
                    setConfirmDeleteQuest(null);
                    if (resolvedQuestId === confirmDeleteQuest) {
                      setActiveQuestId(null as unknown as Id<"quests">);
                    }
                  }}
                  className="flex-1 pixel-btn"
                  style={{ fontSize: 7, padding: "8px", background: "#8b2020", borderColor: "#4a0f0f", boxShadow: "0 4px 0 #2d0808" }}
                >
                  DELETE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete vendor modal */}
      <AnimatePresence>
        {confirmDeleteVendor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setConfirmDeleteVendor(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="pixel-panel p-6 max-w-sm w-full mx-4"
            >
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🗑️</div>
                <div className="font-pixel" style={{ fontSize: 7, color: "var(--wood-outer)" }}>REMOVE THIS VENDOR?</div>
                <p className="text-xs font-semibold mt-2" style={{ color: "var(--muted)" }}>
                  This vendor will be removed from the quest tree.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmDeleteVendor(null)}
                  className="flex-1 pixel-btn"
                  style={{ fontSize: 7, padding: "8px" }}
                >
                  CANCEL
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={async () => {
                    playClick();
                    await removeVendor({ vendorId: confirmDeleteVendor });
                    setConfirmDeleteVendor(null);
                  }}
                  className="flex-1 pixel-btn"
                  style={{ fontSize: 7, padding: "8px", background: "#8b2020", borderColor: "#4a0f0f", boxShadow: "0 4px 0 #2d0808" }}
                >
                  REMOVE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
