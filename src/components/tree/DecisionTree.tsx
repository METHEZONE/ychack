"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useForageStore } from "@/lib/store";
import { TreeNode } from "./TreeNode";
import { motion, AnimatePresence } from "framer-motion";
import { playClick } from "@/lib/sounds";
import { useState } from "react";

type QuestDoc = Doc<"quests">;
type VendorDoc = Doc<"vendors">;

export function DecisionTree() {
  const userId = useForageStore((s) => s.userId);
  const activeQuestId = useForageStore((s) => s.activeQuestId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);

  const quests = useQuery(
    api.quests.listByUser,
    userId ? { userId } : "skip"
  );

  const vendors = useQuery(
    api.vendors.listByUser,
    userId ? { userId } : "skip"
  );

  const removeQuest = useMutation(api.quests.remove);
  const removeVendor = useMutation(api.vendors.remove);

  const [confirmDeleteQuest, setConfirmDeleteQuest] = useState<Id<"quests"> | null>(null);
  const [confirmDeleteVendor, setConfirmDeleteVendor] = useState<Id<"vendors"> | null>(null);

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

  const activeQuest: QuestDoc = quests.find((q: QuestDoc) => q._id === resolvedQuestId)!;

  // Get vendors for active quest directly (no workflowNodes dependency)
  const questVendors = (vendors ?? []).filter(
    (v: VendorDoc) => v.questId === resolvedQuestId
  );

  return (
    <div className="h-full overflow-auto scrollable p-6">
      {/* Quest selector */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
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
            {/* Delete quest button */}
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

      {/* Tree visualization */}
      <div className="flex flex-col items-center gap-6">
        {/* Root quest node with agent character */}
        <div className="flex flex-col items-center">
          <TreeNode
            node={{
              _id: activeQuest._id,
              label: activeQuest.description,
              stage: activeQuest.status,
              isRecommended: false,
              isDead: false,
              questAgent: activeQuest.animalType && activeQuest.characterName
                ? { animalType: activeQuest.animalType, characterName: activeQuest.characterName }
                : undefined,
            }}
            isRoot
          />
        </div>

        {/* Connector */}
        {questVendors.length > 0 && (
          <div className="w-0.5 h-8" style={{ background: "var(--border-game)" }} />
        )}

        {/* Vendor branches */}
        {questVendors.length > 0 && (
          <div className="flex items-start gap-6 flex-wrap justify-center">
            {questVendors.map((vendor: VendorDoc) => (
              <div key={vendor._id} className="relative group flex flex-col items-center gap-2">
                <TreeNode
                  node={{
                    _id: vendor._id,
                    label: vendor.companyName,
                    stage: vendor.stage,
                    isRecommended: false,
                    isDead: vendor.stage === "dead",
                    deadReason: vendor.deadReason,
                    reason: vendor.agentNotes,
                    vendorId: vendor._id,
                  }}
                />
                {/* Delete vendor button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    setConfirmDeleteVendor(vendor._id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{ background: "#ef4444", color: "white", border: "1.5px solid #dc2626" }}
                >
                  ✕
                </motion.button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {questVendors.length === 0 && (
          <div
            className="text-center py-6 px-8 rounded-2xl"
            style={{ background: "var(--cream)", border: "2px solid var(--border-game)" }}
          >
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              No vendors found yet for this quest.
            </p>
          </div>
        )}
      </div>

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
