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
import { Doc, Id } from "../../../convex/_generated/dataModel";

type QuestDoc = Doc<"quests">;
type VendorDoc = Doc<"vendors">;

interface HQInteriorProps {
  onClose: () => void;
  onApprove: (vendor: VendorDoc) => void;
  onForageOpen?: () => void;
}

// Toast component
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onAnimationComplete={() => setTimeout(onDone, 2000)}
      className="fixed bottom-8 left-1/2 z-[60] px-5 py-3 rounded-2xl text-sm font-extrabold shadow-xl"
      style={{ transform: "translateX(-50%)", background: "#1f2937", color: "white" }}
    >
      {message}
    </motion.div>
  );
}

export function HQInterior({ onClose, onForageOpen }: HQInteriorProps) {
  const router = useRouter();
  const userId = useForageStore((s) => s.userId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);
  const [tab, setTab] = useState<"overview" | "tasks" | "roadmap">("overview");
  const [toast, setToast] = useState<string | null>(null);

  const quests = useQuery(api.quests.listByUser, userId ? { userId } : "skip");
  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  const allQuests = quests ?? [];
  const allVendors = vendors ?? [];

  // Stats
  const totalVendors = allVendors.length;
  const contacted = allVendors.filter((v: VendorDoc) => v.stage !== "discovered").length;
  const replied = allVendors.filter((v: VendorDoc) => ["replied", "negotiating", "closed"].includes(v.stage)).length;
  const closed = allVendors.filter((v: VendorDoc) => v.stage === "closed").length;
  const activeQuests = allQuests.filter((q: QuestDoc) => q.status === "active").length;

  // Build task list from quests + vendors
  type TaskItem = {
    id: string;
    label: string;
    sublabel: string;
    emoji: string;
    status: "done" | "active" | "pending";
    route: string | null;
  };

  const tasks: TaskItem[] = [];
  for (const quest of allQuests) {
    const questEmoji = quest.animalType ? (ANIMAL_EMOJI[quest.animalType as AnimalType] ?? "🗺️") : "🗺️";
    const questVendors = allVendors.filter((v: VendorDoc) => v.questId === quest._id);
    const questStatus = quest.status === "completed" ? "done" as const : "active" as const;

    tasks.push({
      id: quest._id,
      label: quest.description,
      sublabel: `${questVendors.length} vendors · ${quest.status}`,
      emoji: questEmoji,
      status: questStatus,
      route: "/tree",
    });

    for (const vendor of questVendors) {
      const stageLabel = STAGE_LABELS[vendor.stage as VendorStage] ?? vendor.stage;
      const vendorStatus = vendor.stage === "closed" ? "done" as const
        : vendor.stage === "dead" ? "pending" as const
        : "active" as const;

      tasks.push({
        id: vendor._id,
        label: `  → ${vendor.companyName}`,
        sublabel: stageLabel,
        emoji: STAGE_COLORS[vendor.stage as VendorStage] ? "" : "🏢",
        status: vendorStatus,
        route: `/vendor/${vendor._id}`,
      });
    }
  }

  function handleTaskClick(task: TaskItem) {
    playClick();
    if (task.route === "/tree") {
      setActiveQuestId(task.id as Id<"quests">);
      onClose();
      router.push("/tree");
    } else if (task.route) {
      onClose();
      router.push(task.route);
    } else {
      setToast("This page doesn't exist yet");
    }
  }

  // Roadmap stages
  const roadmap = [
    { label: "Find Vendors", emoji: "🔍", done: totalVendors > 0, count: totalVendors },
    { label: "Send Outreach", emoji: "📧", done: contacted > 0, count: contacted },
    { label: "Get Replies", emoji: "📨", done: replied > 0, count: replied },
    { label: "Negotiate Deals", emoji: "💬", done: allVendors.some((v: VendorDoc) => v.stage === "negotiating"), count: allVendors.filter((v: VendorDoc) => v.stage === "negotiating").length },
    { label: "Close Deals", emoji: "🤝", done: closed > 0, count: closed },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) { playClick(); onClose(); } }}
    >
      <div
        className="w-full max-w-lg mx-4 pixel-panel flex flex-col"
        style={{ maxHeight: "85vh", boxShadow: "inset 0 0 0 2px var(--wood-light), 6px 6px 0 var(--pixel-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🏡</span>
            <span style={{ fontSize: 9 }}>FORAGE HQ</span>
          </div>
          <div className="flex items-center gap-2">
            {onForageOpen && (
              <button
                className="pixel-btn pixel-btn-green flex items-center gap-1 px-3 py-1.5"
                onClick={() => { playClick(); onClose(); onForageOpen(); }}
              >
                <span style={{ fontSize: 11 }}>🌿</span>
                <span style={{ fontSize: 7 }}>FIND VENDORS</span>
              </button>
            )}
            <button
              className="pixel-btn"
              style={{ padding: "4px 8px", fontSize: 14, lineHeight: 1 }}
              onClick={() => { playClick(); onClose(); }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 flex-shrink-0" style={{ borderColor: "var(--wood-outer)", background: "var(--parchment-dark)" }}>
          {([
            { key: "overview", label: "📊 Overview" },
            { key: "tasks", label: "📋 Tasks", count: tasks.length },
            { key: "roadmap", label: "🗺️ Roadmap" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => { playClick(); setTab(t.key); }}
              className="flex-1 py-2.5 flex items-center justify-center gap-1.5 font-pixel transition-colors"
              style={{
                fontSize: 7,
                background: tab === t.key ? "var(--parchment)" : "transparent",
                color: tab === t.key ? "var(--wood-outer)" : "var(--wood-mid)",
                borderBottom: tab === t.key ? "3px solid var(--wood-outer)" : "3px solid transparent",
              }}
            >
              {t.label}
              {"count" in t && t.count > 0 && (
                <span className="px-1 font-pixel" style={{ background: "var(--accent)", color: "var(--wood-outer)", fontSize: 6, border: "1px solid #a07800" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollable p-4">
          <AnimatePresence mode="wait">
            {/* ── Overview Tab ── */}
            {tab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Active Quests", value: activeQuests, emoji: "🗺️", color: "var(--primary)" },
                    { label: "Total Vendors", value: totalVendors, emoji: "🏢", color: "#60a5fa" },
                    { label: "Replies", value: replied, emoji: "📨", color: "#34d399" },
                    { label: "Deals Closed", value: closed, emoji: "🤝", color: "#fbbf24" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl p-3 text-center" style={{ background: "var(--panel)", border: "2px solid var(--border-game)" }}>
                      <div className="text-2xl mb-1">{stat.emoji}</div>
                      <div className="text-xl font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-xs font-bold" style={{ color: "var(--muted)" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Active quests summary */}
                <div>
                  <h3 className="text-xs font-extrabold mb-2 tracking-wider" style={{ color: "var(--primary-dark)" }}>
                    ACTIVE QUESTS
                  </h3>
                  {allQuests.length === 0 ? (
                    <div className="text-center py-4 text-sm font-semibold" style={{ color: "var(--muted)" }}>
                      No quests yet. Start foraging!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allQuests.map((quest: QuestDoc) => {
                        const qVendors = allVendors.filter((v: VendorDoc) => v.questId === quest._id);
                        const agentEmoji = quest.animalType ? (ANIMAL_EMOJI[quest.animalType as AnimalType] ?? "🗺️") : "🗺️";
                        return (
                          <motion.div
                            key={quest._id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              playClick();
                              setActiveQuestId(quest._id);
                              onClose();
                              router.push("/tree");
                            }}
                            className="rounded-2xl p-3 flex items-center gap-3 cursor-pointer"
                            style={{ background: "var(--panel)", border: "2px solid var(--border-game)" }}
                          >
                            <span className="text-2xl">{agentEmoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-extrabold truncate" style={{ color: "var(--text)" }}>
                                {quest.characterName && <span style={{ color: "var(--muted)" }}>{quest.characterName}: </span>}
                                {quest.description}
                              </div>
                              <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                                {qVendors.length} vendors
                              </div>
                            </div>
                            <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>→</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Tasks Tab ── */}
            {tab === "tasks" && (
              <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📋</div>
                    <div className="text-sm font-bold" style={{ color: "var(--muted)" }}>No tasks yet</div>
                    <div className="text-xs mt-1 font-semibold" style={{ color: "var(--muted)" }}>Start foraging to create quests and tasks</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tasks.map((task, i) => {
                      const isQuest = !task.label.startsWith("  →");
                      const stageKey = !isQuest ? allVendors.find((v: VendorDoc) => v._id === task.id)?.stage : null;
                      const stageColor = stageKey ? STAGE_COLORS[stageKey as VendorStage] : null;

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => handleTaskClick(task)}
                          className={`rounded-xl px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors hover:brightness-95 ${isQuest ? "mt-2" : ""}`}
                          style={{
                            background: isQuest ? "var(--primary)" + "15" : "var(--panel)",
                            border: isQuest ? "2px solid var(--primary)44" : "1.5px solid var(--border-game)",
                          }}
                        >
                          {/* Status dot */}
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              background: task.status === "done" ? "#34d399"
                                : stageColor ?? (task.status === "active" ? "var(--primary)" : "#cbd5e1"),
                            }}
                          />

                          {/* Task info */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-extrabold truncate ${isQuest ? "" : "pl-2"}`} style={{ color: task.status === "done" ? "var(--muted)" : "var(--text)" }}>
                              {task.emoji && <span className="mr-1">{task.emoji}</span>}
                              {task.label.replace("  → ", "")}
                            </div>
                            <div className={`text-xs font-semibold ${isQuest ? "" : "pl-2"}`} style={{ color: "var(--muted)" }}>
                              {task.sublabel}
                            </div>
                          </div>

                          {/* Arrow */}
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--muted)" }}>→</span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Roadmap Tab ── */}
            {tab === "roadmap" && (
              <motion.div key="roadmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-1">
                  {roadmap.map((step, i) => (
                    <div key={step.label} className="flex items-stretch gap-3">
                      {/* Timeline */}
                      <div className="flex flex-col items-center w-10 flex-shrink-0">
                        <motion.div
                          initial={false}
                          animate={{
                            backgroundColor: step.done ? "var(--primary)" : "#e2e8f0",
                            borderColor: step.done ? "var(--primary)" : "#cbd5e1",
                          }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 flex-shrink-0"
                        >
                          {step.done ? (
                            <span style={{ color: "white", fontSize: 14, fontWeight: 800 }}>✓</span>
                          ) : (
                            <span>{step.emoji}</span>
                          )}
                        </motion.div>
                        {i < roadmap.length - 1 && (
                          <div className="w-0.5 flex-1 min-h-[20px]" style={{ background: step.done ? "var(--primary)" : "#e2e8f0" }} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="pb-4 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold" style={{ color: step.done ? "var(--primary-dark)" : "var(--muted)" }}>
                            {step.label}
                          </span>
                          {step.count > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--primary)22", color: "var(--primary)" }}>
                              {step.count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
