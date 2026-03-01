"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { playClick, playChime } from "@/lib/sounds";

const STEPS = [
  {
    emoji: "🌿",
    title: "Welcome to your village!",
    body: "This is where your vendors live as Animal Crossing NPCs. Each vendor you find becomes a new neighbor that moves in.",
    cta: "Next →",
  },
  {
    emoji: "💬",
    title: "Chat to find vendors",
    body: "Open the chat bar at the bottom and type something like:\n\n\"Find cotton fabric manufacturers in Vietnam\"\n\nYour AI agent will forage the web and fill contact forms automatically.",
    cta: "Next →",
  },
  {
    emoji: "🦊",
    title: "Click any NPC",
    body: "Once vendors move in, click their character to see deal progress, view quotes, and send negotiation emails — all AI-drafted.",
    cta: "Next →",
  },
  {
    emoji: "🗺️",
    title: "Track decisions",
    body: "The Quests tab shows a decision tree of all vendors found, their status, and which ones Forage recommends. Never lose track.",
    cta: "Let's go! 🎉",
  },
];

export function VillageTutorial() {
  const userId = useForageStore((s) => s.userId);
  const updatePrefs = useMutation(api.users.updatePreferences);
  const user = useQuery(api.users.get, userId ? { userId } : "skip");

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only for first-time visitors (check DB)
    if (user === undefined) return; // loading
    if (user && !user.tutorialDone) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [user]);

  function handleNext() {
    playClick();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      playChime();
      if (userId) updatePrefs({ userId, tutorialDone: true });
      setVisible(false);
    }
  }

  function handleSkip() {
    if (userId) updatePrefs({ userId, tutorialDone: true });
    setVisible(false);
  }

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
        >
          <motion.div
            key={step}
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="mx-4 max-w-sm w-full rounded-3xl p-7 shadow-2xl"
            style={{
              background: "var(--cream)",
              border: "4px solid var(--primary)",
              boxShadow: "0 12px 40px rgba(61,138,53,0.3)",
            }}
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-5">
              {STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scale: i === step ? 1.4 : 1 }}
                  className="rounded-full"
                  style={{
                    width: 7, height: 7,
                    background: i === step ? "var(--primary)" : i < step ? "var(--primary-dark)" : "var(--border-game)",
                    opacity: i < step ? 0.5 : 1,
                  }}
                />
              ))}
            </div>

            <div className="text-5xl text-center mb-3">{current.emoji}</div>
            <h2
              className="text-xl font-extrabold text-center mb-3"
              style={{
                color: "var(--primary-dark)",
                fontFamily: "var(--font-fredoka, 'Fredoka One', cursive)",
              }}
            >
              {current.title}
            </h2>
            <p
              className="text-sm font-semibold text-center whitespace-pre-wrap leading-relaxed mb-6"
              style={{ color: "var(--text)" }}
            >
              {current.body}
            </p>

            <motion.button
              onClick={handleNext}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-3 rounded-2xl font-extrabold text-base"
              style={{
                background: "var(--primary)",
                color: "white",
                border: "3px solid var(--primary-dark)",
              }}
            >
              {current.cta}
            </motion.button>

            {step < STEPS.length - 1 && (
              <button
                onClick={handleSkip}
                className="w-full mt-2 py-2 text-xs font-bold transition-opacity hover:opacity-60"
                style={{ color: "var(--muted)" }}
              >
                Skip tutorial
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
