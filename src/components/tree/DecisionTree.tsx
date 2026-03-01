"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useForageStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { playClick, playChime } from "@/lib/sounds";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { SpriteHead } from "@/components/ui/SpriteHead";

type QuestDoc = Doc<"quests">;
type VendorDoc = Doc<"vendors">;

type ViewMode = "tree" | "compare" | "recommend";

const QUEST_BOTTOM_Y = 120;
const VENDOR_TOP_Y = 270;

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
        <div className="text-center">
          <div className="text-5xl mb-3">🗺️</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            No quests yet
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Start by asking Forage to find vendors for you.
          </p>
        </div>
      </div>
    );
  }

  // Auto-select first quest if no active quest
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

  // Compute vendor x positions
  const spacing = containerW / (questVendors.length + 1);
  const vendorXs = questVendors.map((_: VendorDoc, i: number) => spacing * (i + 1));
  const questCX = containerW / 2;

  return (
    <div className="h-full overflow-auto scrollable p-6">
      {/* Quest selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {quests.map((quest: QuestDoc) => (
          <div key={quest._id} className="relative group">
            <button
              onClick={() => {
                playClick();
                setActiveQuestId(quest._id);
              }}
              className="px-4 py-2 rounded-full text-sm font-bold transition-all"
              style={
                quest._id === resolvedQuestId
                  ? { background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }
                  : {
                      background: "var(--cream)",
                      color: "var(--text)",
                      border: "2px solid var(--border-game)",
                    }
              }
            >
              {quest.description}
            </button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                playClick();
                setConfirmDeleteQuest(quest._id);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "#ef4444", color: "white", border: "1.5px solid #dc2626" }}
            >
              ✕
            </motion.button>
          </div>
        ))}
      </div>

      {/* View mode tabs */}
      {questVendors.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {(["tree", "compare", "recommend"] as ViewMode[]).map((mode) => (
            <motion.button
              key={mode}
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); setViewMode(mode); if (mode === "recommend" && !recommendedVendorId) handleRecommend(); }}
              className="px-3 py-1.5 rounded-full text-xs font-extrabold transition-all"
              style={viewMode === mode
                ? { background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }
                : { background: "var(--cream)", color: "var(--text)", border: "2px solid var(--border-game)" }
              }
            >
              {mode === "tree" ? "🌳 Tree" : mode === "compare" ? "📊 Compare" : "⭐ Recommend"}
            </motion.button>
          ))}
        </div>
      )}

      {/* ── COMPARE VIEW ─────────────────────────────────────────────── */}
      {viewMode === "compare" && questVendors.length > 0 && (
        <div className="overflow-x-auto rounded-2xl mb-6" style={{ border: "2px solid var(--border-game)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--primary)", color: "white" }}>
                <th className="px-3 py-2.5 text-left font-extrabold">Vendor</th>
                <th className="px-3 py-2.5 text-center font-extrabold">Stage</th>
                <th className="px-3 py-2.5 text-center font-extrabold">💰 Price</th>
                <th className="px-3 py-2.5 text-center font-extrabold">📦 MOQ</th>
                <th className="px-3 py-2.5 text-center font-extrabold">⏱ Lead</th>
                <th className="px-3 py-2.5 text-center font-extrabold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {questVendors.map((v: VendorDoc, i: number) => {
                const stageColor = STAGE_COLORS[v.stage as VendorStage] ?? "#888";
                const stageLabel = STAGE_LABELS[v.stage as VendorStage] ?? v.stage;
                const isRec = v._id === recommendedVendorId;
                return (
                  <tr
                    key={v._id}
                    onClick={() => { playClick(); router.push(`/vendor/${v._id}`); }}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: isRec ? "rgba(255,208,74,0.12)" : i % 2 === 0 ? "var(--cream)" : "var(--panel)",
                      borderBottom: "1px solid var(--border-game)",
                    }}
                  >
                    <td className="px-3 py-2.5 font-extrabold" style={{ color: "var(--text)" }}>
                      {isRec && <span className="mr-1">⭐</span>}
                      {v.companyName}
                      {v.location && <div className="text-xs font-normal opacity-60">{v.location}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: stageColor + "22", color: stageColor }}>
                        {stageLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>
                      {v.quote?.price ?? <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>
                      {v.quote?.moq ?? <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>
                      {v.quote?.leadTime ?? <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px]" style={{ color: "var(--muted)" }}>
                      {v.agentNotes ? v.agentNotes.slice(0, 80) + (v.agentNotes.length > 80 ? "…" : "") : <span className="opacity-30">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {vendorsWithQuotes.length === 0 && (
            <div className="text-center py-4 text-xs font-semibold" style={{ color: "var(--muted)" }}>
              No quotes yet — vendors need to reply first
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
              <div className="text-sm font-extrabold" style={{ color: "var(--primary-dark)" }}>Forage is picking the best...</div>
            </motion.div>
          ) : recommendReason ? (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl px-5 py-4 mb-6"
              style={{ background: "var(--cream)", border: "2.5px solid var(--accent)" }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">⭐</div>
                <div>
                  {recommendedVendorId && (
                    <div className="text-sm font-extrabold mb-1" style={{ color: "var(--primary-dark)" }}>
                      Best pick: {questVendors.find((v: VendorDoc) => v._id === recommendedVendorId)?.companyName ?? "a vendor"}
                    </div>
                  )}
                  <div className="text-xs font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
                    {recommendReason}
                  </div>
                  {recommendedVendorId && (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { playClick(); router.push(`/vendor/${recommendedVendorId}`); }}
                      className="mt-2.5 px-3 py-1.5 rounded-full text-xs font-extrabold"
                      style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                    >
                      View vendor →
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
            minHeight: VENDOR_TOP_Y + 180,
            border: "3px solid var(--wood-outer)",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)",
          }}
        >
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
                const color = STAGE_COLORS[v.stage as VendorStage] ?? "#8B6914";
                return (
                  <g key={v._id}>
                    {/* Shadow root */}
                    <path d={rootPath(questCX, vendorXs[i])} fill="none" stroke="#3d2010" strokeWidth={5} />
                    {/* Glowing colored root — draws in */}
                    <path
                      d={rootPath(questCX, vendorXs[i])}
                      fill="none"
                      stroke={color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: 500,
                        strokeDashoffset: 500,
                        animation: `drawRoot 1s ease forwards ${i * 0.18 + 0.4}s`,
                        filter: `drop-shadow(0 0 5px ${color})`,
                      }}
                    />
                    {/* Energy pulse orb */}
                    <circle r={5} fill={color} style={{ filter: "drop-shadow(0 0 7px currentColor)", opacity: 0.95 }}>
                      <animateMotion
                        dur={`${1.8 + i * 0.25}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.18 + 1.5}s`}
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
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="pixel-panel flex flex-col items-center gap-2 px-4 py-3"
              style={{ minWidth: 160, background: "var(--parchment)" }}
            >
              {activeQuest.animalType ? (
                <SpriteHead animalType={activeQuest.animalType} size={48} />
              ) : (
                <span style={{ fontSize: 32 }}>🗺️</span>
              )}
              <div
                className="font-pixel text-center"
                style={{ fontSize: 7, color: "var(--wood-outer)", maxWidth: 150 }}
              >
                {activeQuest.description.slice(0, 30)}{activeQuest.description.length > 30 ? "…" : ""}
              </div>
            </motion.div>
          </div>

          {/* Vendor nodes (bottom row) */}
          {questVendors.map((vendor: VendorDoc, i: number) => (
            <motion.div
              key={vendor._id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 450, damping: 22, delay: i * 0.18 + 0.9 }}
              style={{
                position: "absolute",
                top: VENDOR_TOP_Y,
                left: vendorXs[i] - 64,
                width: 128,
                cursor: "pointer",
                zIndex: 1,
              }}
              className="pixel-panel group"
              onClick={() => { playClick(); router.push(`/vendor/${vendor._id}`); }}
            >
              {/* Stage color stripe */}
              <div style={{ height: 4, background: STAGE_COLORS[vendor.stage as VendorStage] ?? "#888" }} />
              <div className="p-2 text-center">
                <div
                  className="font-pixel"
                  style={{ fontSize: 6, color: "var(--wood-outer)", lineHeight: 1.7 }}
                >
                  {vendor.companyName.slice(0, 14)}{vendor.companyName.length > 14 ? "…" : ""}
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: STAGE_COLORS[vendor.stage as VendorStage] ?? "#888",
                    fontFamily: "var(--font-pixel)",
                    marginTop: 3,
                  }}
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
          ))}

          {/* Empty state */}
          {questVendors.length === 0 && (
            <div
              className="text-center py-6 px-8"
              style={{
                position: "absolute",
                top: VENDOR_TOP_Y + 20,
                left: "50%",
                transform: "translateX(-50%)",
                color: "#7a5a3a",
                fontFamily: "var(--font-nunito), sans-serif",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              No vendors found yet for this quest.
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
              className="rounded-3xl p-6 max-w-sm w-full mx-4"
              style={{ background: "var(--cream)", border: "3px solid #ef4444" }}
            >
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🗑️</div>
                <h3 className="text-sm font-extrabold" style={{ color: "var(--text)" }}>
                  Delete this quest?
                </h3>
                <p className="text-xs font-semibold mt-1" style={{ color: "var(--muted)" }}>
                  This will also delete all vendors in this quest.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmDeleteQuest(null)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold"
                  style={{ background: "var(--panel)", color: "var(--text)", border: "2px solid var(--border-game)" }}
                >
                  Cancel
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
                  className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold"
                  style={{ background: "#ef4444", color: "white", border: "2px solid #dc2626" }}
                >
                  Delete
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
              className="rounded-3xl p-6 max-w-sm w-full mx-4"
              style={{ background: "var(--cream)", border: "3px solid #ef4444" }}
            >
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🗑️</div>
                <h3 className="text-sm font-extrabold" style={{ color: "var(--text)" }}>
                  Remove this vendor?
                </h3>
                <p className="text-xs font-semibold mt-1" style={{ color: "var(--muted)" }}>
                  This vendor will be removed from the quest tree.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmDeleteVendor(null)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold"
                  style={{ background: "var(--panel)", color: "var(--text)", border: "2px solid var(--border-game)" }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={async () => {
                    playClick();
                    await removeVendor({ vendorId: confirmDeleteVendor });
                    setConfirmDeleteVendor(null);
                  }}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold"
                  style={{ background: "#ef4444", color: "white", border: "2px solid #dc2626" }}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
