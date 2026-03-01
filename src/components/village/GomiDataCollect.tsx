"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { playDialogueBlip, playChime, playClick } from "@/lib/sounds";

interface GomiDataCollectProps {
  onClose: () => void;
  returnVendorId?: string | null;
  isMandatory?: boolean;
}

interface CollectStep {
  key: "name" | "companyName" | "email" | "companyDescription" | "productionScale" | "timeline" | "geoPreference";
  gomiText: string | ((answers: Record<string, string>) => string);
  placeholder: string;
  multiline?: boolean;
}

const ALL_STEPS: CollectStep[] = [
  {
    key: "name",
    gomiText: "Welcome to the village! I'm Gomi, the mayor. What should I call you?",
    placeholder: "e.g. Sarah",
  },
  {
    key: "companyName",
    gomiText: (a) => `Nice to meet you, ${a.name || "friend"}! What's your company or brand name?`,
    placeholder: "e.g. Sunny Snacks Co.",
  },
  {
    key: "email",
    gomiText: "And what's the best email for vendors to reach you?",
    placeholder: "e.g. hello@sunnysnacks.com",
  },
  {
    key: "companyDescription",
    gomiText: "Tell me about what you're making — what's the product, who's it for?",
    placeholder: "e.g. Organic fruit snacks for kids, launching this summer...",
    multiline: true,
  },
  {
    key: "productionScale",
    gomiText: "How much are you looking to produce? Any rough budget in mind?",
    placeholder: "e.g. 500-1000 units, ~$5,000",
  },
  {
    key: "timeline",
    gomiText: "When do you need this ready? Launching soon or still exploring?",
    placeholder: "e.g. Samples by April, launch by summer",
  },
  {
    key: "geoPreference",
    gomiText: "Last one! Preference for vendor location? Domestic, overseas?",
    placeholder: "e.g. US preferred, open to Asia",
  },
];

export function GomiDataCollect({ onClose, returnVendorId, isMandatory }: GomiDataCollectProps) {
  const router = useRouter();
  const userId = useForageStore((s) => s.userId);
  const user = useQuery(api.users.get, userId ? { userId } : "skip");
  const updateCompanyData = useMutation(api.users.updateCompanyData);

  const [phase, setPhase] = useState<"intro" | "collecting" | "done">("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [textDone, setTextDone] = useState(false);
  const [saving, setSaving] = useState(false);
  // Track answers collected this session (for dynamic gomiText like {name})
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const typeIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Determine which steps are needed (skip already-filled fields)
  const [neededSteps, setNeededSteps] = useState<CollectStep[]>([]);

  useEffect(() => {
    if (user === undefined) return; // loading
    const missing = ALL_STEPS.filter((step) => {
      const val = user?.[step.key as keyof typeof user];
      return !val || (typeof val === "string" && val.trim() === "");
    });
    setNeededSteps(missing);
    // Seed answers with existing user data
    const existing: Record<string, string> = {};
    for (const step of ALL_STEPS) {
      const val = user?.[step.key as keyof typeof user];
      if (val && typeof val === "string" && val.trim()) {
        existing[step.key] = val;
      }
    }
    setAnswers(existing);
    if (missing.length === 0) {
      setPhase("done");
    }
  }, [user]);

  // Resolve gomiText (static or dynamic)
  const resolveGomiText = useCallback((step: CollectStep) => {
    if (typeof step.gomiText === "function") return step.gomiText(answers);
    return step.gomiText;
  }, [answers]);

  // Get current text to display
  const getCurrentText = useCallback(() => {
    if (phase === "intro") {
      return "Hey there! I'm Gomi, the village mayor. Before you reach out to vendors, let me learn a bit about you and your business. It'll only take a moment!";
    }
    if (phase === "done") {
      return "You're all set! I've got everything I need. Let's build your village! 🎉";
    }
    const step = neededSteps[stepIdx];
    return step ? resolveGomiText(step) : "";
  }, [phase, stepIdx, neededSteps, resolveGomiText]);

  // Typewriter effect
  useEffect(() => {
    const fullText = getCurrentText();
    if (!fullText) return;

    typeIndexRef.current = 0;
    setDisplayText("");
    setTextDone(false);

    const iv = setInterval(() => {
      const i = typeIndexRef.current;
      if (i >= fullText.length) {
        clearInterval(iv);
        setTextDone(true);
        return;
      }
      setDisplayText(fullText.slice(0, i + 1));
      if (i % 3 === 0) playDialogueBlip("bear");
      typeIndexRef.current = i + 1;
    }, 32);

    return () => clearInterval(iv);
  }, [phase, stepIdx, getCurrentText]);

  // Auto-focus input when typewriter finishes
  useEffect(() => {
    if (textDone && phase === "collecting" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [textDone, phase]);

  function skipTypewriter() {
    if (!textDone) {
      const fullText = getCurrentText();
      typeIndexRef.current = fullText.length;
      setDisplayText(fullText);
      setTextDone(true);
    }
  }

  function handleStartCollecting() {
    playClick();
    if (neededSteps.length === 0) {
      setPhase("done");
    } else {
      setPhase("collecting");
      setStepIdx(0);
      setInputValue("");
    }
  }

  async function handleSubmitStep() {
    if (!userId || !inputValue.trim()) return;
    const step = neededSteps[stepIdx];
    if (!step) return;

    playClick();
    setSaving(true);
    try {
      // Track answer for dynamic text interpolation
      setAnswers((prev) => ({ ...prev, [step.key]: inputValue.trim() }));

      const isLastStep = stepIdx >= neededSteps.length - 1;

      await updateCompanyData({
        userId,
        [step.key]: inputValue.trim(),
        ...(isLastStep ? { gomiOnboardingDone: true } : {}),
      });

      if (!isLastStep) {
        setStepIdx(stepIdx + 1);
        setInputValue("");
      } else {
        playChime();
        setPhase("done");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    playClick();
    if (returnVendorId) {
      router.push(`/vendor/${returnVendorId}`);
    } else {
      onClose();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitStep();
    }
  }

  const currentStep = neededSteps[stepIdx];
  const progress = neededSteps.length > 0
    ? phase === "done"
      ? 100
      : Math.round(((stepIdx) / neededSteps.length) * 100)
    : 100;

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 34 }}
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        background: "var(--cream)",
        borderTop: "4px solid var(--primary)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        minHeight: 200,
      }}
      onClick={skipTypewriter}
    >
      {/* Progress bar */}
      {phase === "collecting" && neededSteps.length > 0 && (
        <div className="px-5 pt-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-game)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--primary)" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-xs font-bold mt-1 text-right" style={{ color: "var(--muted)" }}>
            {stepIdx + 1} / {neededSteps.length}
          </div>
        </div>
      )}

      <div className="flex gap-4 px-5 pt-3 pb-5">
        {/* Gomi avatar */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-20">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-md"
            style={{ background: "#5BAD4E28", border: "3px solid #5BAD4E60" }}
          >
            🐻
          </motion.div>
          <div
            className="text-xs font-extrabold text-center px-2 py-0.5 rounded-full"
            style={{ background: "#5BAD4E", color: "white" }}
          >
            Gomi
          </div>
          <div
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#5BAD4E22", color: "#5BAD4E", border: "1.5px solid #5BAD4E55" }}
          >
            Mayor
          </div>
        </div>

        {/* Dialogue content */}
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold leading-relaxed mb-3 min-h-[48px]"
            style={{ color: "var(--text)" }}
          >
            {displayText}
            {!textDone && (
              <span className="typewriter-cursor" style={{ color: "var(--primary)" }}>▌</span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* Intro → Start button */}
            {phase === "intro" && textDone && (
              <motion.div
                key="intro-btn"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => { e.stopPropagation(); handleStartCollecting(); }}
                  className="px-5 py-2.5 rounded-2xl text-sm font-extrabold"
                  style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                >
                  Let&apos;s go!
                </motion.button>
                {!isMandatory && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="px-4 py-2.5 rounded-2xl text-sm font-extrabold"
                    style={{ background: "var(--panel)", color: "var(--muted)", border: "2px solid var(--border-game)" }}
                  >
                    Later...
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Collecting → Input field */}
            {phase === "collecting" && textDone && currentStep && (
              <motion.div
                key={`step-${stepIdx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {currentStep.multiline ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentStep.placeholder}
                    rows={3}
                    className="w-full text-sm leading-relaxed p-3 rounded-2xl outline-none resize-none font-semibold"
                    style={{
                      background: "var(--panel)",
                      border: "2.5px solid var(--border-game)",
                      color: "var(--text)",
                    }}
                  />
                ) : (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={currentStep.key === "email" ? "email" : "text"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentStep.placeholder}
                    className="w-full text-sm p-3 rounded-2xl outline-none font-semibold"
                    style={{
                      background: "var(--panel)",
                      border: "2.5px solid var(--border-game)",
                      color: "var(--text)",
                    }}
                  />
                )}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSubmitStep}
                    disabled={!inputValue.trim() || saving}
                    className="px-5 py-2 rounded-2xl text-sm font-extrabold disabled:opacity-50"
                    style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                  >
                    {saving ? "Saving..." : stepIdx < neededSteps.length - 1 ? "Next →" : "Done!"}
                  </motion.button>
                  {stepIdx > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { playClick(); setStepIdx(stepIdx - 1); setInputValue(""); }}
                      className="px-4 py-2 rounded-2xl text-sm font-extrabold"
                      style={{ background: "var(--panel)", color: "var(--muted)", border: "2px solid var(--border-game)" }}
                    >
                      ← Back
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Done */}
            {phase === "done" && textDone && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => { e.stopPropagation(); handleDone(); }}
                  className="px-5 py-2.5 rounded-2xl text-sm font-extrabold"
                  style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                >
                  {returnVendorId ? "← Back to vendor" : "Back to village"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom hint */}
      {!isMandatory && (
        <div className="pb-3 text-center text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Click to advance · Press Escape to close
        </div>
      )}
    </motion.div>
  );
}
