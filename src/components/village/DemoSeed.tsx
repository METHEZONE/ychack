"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { playChime } from "@/lib/sounds";

const LS_DEMO_SEEDED = "forage_demo_seeded";

export function DemoSeed() {
  const userId = useForageStore((s) => s.userId);
  const activeQuestId = useForageStore((s) => s.activeQuestId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);

  const [showPrompt, setShowPrompt] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const seedDemoVendors = useMutation(api.demo.seedDemoVendors);
  const vendors = useQuery(
    api.vendors.listByUser,
    userId ? { userId } : "skip"
  );

  useEffect(() => {
    // If village is empty AND hasn't been seeded before, prompt
    if (vendors && vendors.length === 0 && !localStorage.getItem(LS_DEMO_SEEDED) && userId) {
      const t = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(t);
    }
  }, [vendors, userId]);

  async function handleSeed() {
    if (!userId) return;
    setSeeding(true);
    try {
      const result = await seedDemoVendors({
        userId,
        questId: activeQuestId ?? undefined,
      });
      if (result && result.questId && !activeQuestId) {
        setActiveQuestId(result.questId as Parameters<typeof setActiveQuestId>[0]);
      }
      playChime();
      localStorage.setItem(LS_DEMO_SEEDED, "1");
    } finally {
      setSeeding(false);
      setShowPrompt(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(LS_DEMO_SEEDED, "1");
    setShowPrompt(false);
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className="fixed bottom-24 left-1/2 z-40 mx-4"
          style={{ transform: "translateX(-50%)" }}
        >
          <div
            className="rounded-3xl px-6 py-5 shadow-2xl max-w-sm w-screen"
            style={{
              background: "var(--cream)",
              border: "3.5px solid var(--accent)",
              boxShadow: "0 8px 32px rgba(255,208,74,0.35)",
            }}
          >
            <div className="text-3xl text-center mb-2">🏘️</div>
            <p className="text-sm font-extrabold text-center mb-1" style={{ color: "var(--text)" }}>
              Village is empty!
            </p>
            <p className="text-xs font-semibold text-center mb-4" style={{ color: "var(--muted)" }}>
              Load demo vendors to see the village in action, or type in chat to start foraging for real.
            </p>
            <div className="flex gap-2">
              <motion.button
                onClick={handleSeed}
                disabled={seeding}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex-1 py-2.5 rounded-2xl font-extrabold text-sm disabled:opacity-50"
                style={{
                  background: "var(--accent)",
                  color: "var(--text)",
                  border: "2.5px solid var(--accent-hover)",
                }}
              >
                {seeding ? "Loading..." : "✨ Load demo"}
              </motion.button>
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-2xl font-bold text-sm"
                style={{
                  background: "var(--panel)",
                  color: "var(--muted)",
                  border: "2px solid var(--border-game)",
                }}
              >
                I&apos;ll forage myself
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
