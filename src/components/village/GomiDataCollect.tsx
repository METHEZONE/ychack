"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { playDialogueBlip, playChime, playClick } from "@/lib/sounds";
import { ANIMAL_EMOJI, ANIMAL_COLORS, ANIMAL_TYPES, AnimalType, assignAnimal } from "@/lib/animals";
import { Id } from "../../../convex/_generated/dataModel";

interface GomiDataCollectProps {
  onClose: () => void;
  isMandatory?: boolean;
  returnVendorId?: string | null;
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

export function GomiDataCollect({ onClose, isMandatory }: GomiDataCollectProps) {
  const userId = useForageStore((s) => s.userId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);
  const user = useQuery(api.users.get, userId ? { userId } : "skip");
  const updateCompanyData = useMutation(api.users.updateCompanyData);
  const createQuest = useMutation(api.quests.create);
  const updatePrefs = useMutation(api.users.updatePreferences);
  const autoForage = useAction(api.actions.forage.autoForageOnboarding);

  const [phase, setPhase] = useState<"intro" | "collecting" | "agents" | "deploying" | "done">("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [textDone, setTextDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedNeedIdxs, setSelectedNeedIdxs] = useState<Set<number>>(new Set());
  const typeIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Build agent list from user.needs (saved during pre-login onboarding)
  const agentOptions = (user?.needs ?? []).slice(0, ANIMAL_TYPES.length).map((category, i) => {
    const { animalType, characterName } = assignAnimal(i);
    return { category, animalType: animalType as AnimalType, characterName, index: i };
  });

  // Calculate needed steps ONCE on initial load
  const [neededSteps, setNeededSteps] = useState<CollectStep[] | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    if (user === undefined) return;

    initializedRef.current = true;

    const missing = ALL_STEPS.filter((step) => {
      const val = user?.[step.key as keyof typeof user];
      return !val || (typeof val === "string" && val.trim() === "");
    });

    const existing: Record<string, string> = {};
    for (const step of ALL_STEPS) {
      const val = user?.[step.key as keyof typeof user];
      if (val && typeof val === "string" && val.trim()) {
        existing[step.key] = val;
      }
    }
    setAnswers(existing);
    setNeededSteps(missing);

    if (missing.length === 0) {
      setPhase("agents");
    }
  }, [user]);

  // Auto-select all agents on load
  useEffect(() => {
    if (agentOptions.length > 0 && selectedNeedIdxs.size === 0) {
      setSelectedNeedIdxs(new Set(agentOptions.map((_, i) => i)));
    }
  }, [agentOptions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveGomiText = useCallback((step: CollectStep) => {
    if (typeof step.gomiText === "function") return step.gomiText(answers);
    return step.gomiText;
  }, [answers]);

  const getCurrentText = useCallback(() => {
    if (phase === "intro") {
      return "Hey there! I'm Gomi, the village mayor. Before we deploy your agents, let me learn a bit about you and your business!";
    }
    if (phase === "collecting" && neededSteps) {
      const step = neededSteps[stepIdx];
      return step ? resolveGomiText(step) : "";
    }
    if (phase === "agents") {
      return "Here are your agents ready to forage! Check the ones you'd like to deploy:";
    }
    if (phase === "deploying") {
      return "Deploying agents... They're heading out to forage for vendors now!";
    }
    if (phase === "done") {
      return "Your agents are out foraging! They'll bring back vendors to your village soon. 🎉";
    }
    return "";
  }, [phase, stepIdx, neededSteps, resolveGomiText]);

  // Typewriter
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

  // Auto-focus input
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
    if (!neededSteps || neededSteps.length === 0) {
      setPhase("agents");
    } else {
      setPhase("collecting");
      setStepIdx(0);
      setInputValue("");
    }
  }

  async function handleSubmitStep() {
    if (!userId || !inputValue.trim() || !neededSteps) return;
    const step = neededSteps[stepIdx];
    if (!step) return;

    playClick();
    setSaving(true);
    try {
      setAnswers((prev) => ({ ...prev, [step.key]: inputValue.trim() }));

      await updateCompanyData({
        userId,
        [step.key]: inputValue.trim(),
      });

      if (stepIdx < neededSteps.length - 1) {
        setStepIdx(stepIdx + 1);
        setInputValue("");
      } else {
        // All questions done → go to agent checkboxes
        playChime();
        setPhase("agents");
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleAgent(idx: number) {
    playClick();
    setSelectedNeedIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleDeploy() {
    if (!userId) return;
    playClick();
    setPhase("deploying");
    try {
      // Create quests for selected agents
      const selected = agentOptions.filter((_, i) => selectedNeedIdxs.has(i));
      let firstQuestId: Id<"quests"> | null = null;
      for (const agent of selected) {
        const qId = await createQuest({
          userId,
          description: `Find ${agent.category} vendors`,
          animalType: agent.animalType,
          characterName: agent.characterName,
        });
        if (!firstQuestId) firstQuestId = qId;
      }

      if (firstQuestId) {
        await updatePrefs({ userId, activeQuestId: firstQuestId });
        setActiveQuestId(firstQuestId);
      }

      await updateCompanyData({ userId, gomiOnboardingDone: true });

      // Fire-and-forget auto-forage
      autoForage({ userId }).catch(() => {});

      playChime();
      setPhase("done");
    } catch {
      setPhase("done");
    }
  }

  function handleDone() {
    playClick();
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitStep();
    }
  }

  const currentStep = neededSteps?.[stepIdx];
  const totalSteps = (neededSteps?.length ?? 0) + 1; // +1 for agents step
  const currentProgress = phase === "collecting"
    ? Math.round((stepIdx / totalSteps) * 100)
    : phase === "agents"
      ? Math.round(((neededSteps?.length ?? 0) / totalSteps) * 100)
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
      {(phase === "collecting" || phase === "agents") && (
        <div className="px-5 pt-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-game)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--primary)" }}
              animate={{ width: `${currentProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-xs font-bold mt-1 text-right" style={{ color: "var(--muted)" }}>
            {phase === "collecting" ? `${stepIdx + 1} / ${totalSteps}` : `${totalSteps} / ${totalSteps}`}
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

        {/* Dialogue */}
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
            {/* Intro */}
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

            {/* Collecting */}
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
                    style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)", color: "var(--text)" }}
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
                    style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)", color: "var(--text)" }}
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
                    {saving ? "Saving..." : "Next →"}
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

            {/* Agents checkboxes */}
            {phase === "agents" && textDone && (
              <motion.div
                key="agents"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {agentOptions.map((agent, i) => {
                  const emoji = ANIMAL_EMOJI[agent.animalType] ?? "🐾";
                  const color = ANIMAL_COLORS[agent.animalType] ?? "#888";
                  const checked = selectedNeedIdxs.has(i);

                  return (
                    <motion.button
                      key={i}
                      onClick={() => toggleAgent(i)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left w-full"
                      style={{
                        background: checked ? `${color}18` : "var(--panel)",
                        border: `2.5px solid ${checked ? color : "var(--border-game)"}`,
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-black"
                        style={{
                          background: checked ? color : "var(--panel)",
                          border: `2px solid ${checked ? color : "var(--border-game)"}`,
                          color: "white",
                        }}
                      >
                        {checked ? "✓" : ""}
                      </div>
                      <span className="text-2xl flex-shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold truncate" style={{ color: "var(--text)" }}>
                          {agent.characterName}
                        </div>
                        <div className="text-xs font-semibold truncate" style={{ color: "var(--muted)" }}>
                          Find {agent.category} vendors
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                {agentOptions.length === 0 && (
                  <div className="text-sm font-semibold py-2" style={{ color: "var(--muted)" }}>
                    No agents selected during setup.
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleDeploy}
                  disabled={selectedNeedIdxs.size === 0}
                  className="px-5 py-2.5 rounded-2xl text-sm font-extrabold disabled:opacity-50 mt-1"
                  style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                >
                  Deploy {selectedNeedIdxs.size} agent{selectedNeedIdxs.size !== 1 ? "s" : ""} 🌿
                </motion.button>
              </motion.div>
            )}

            {/* Deploying */}
            {phase === "deploying" && (
              <motion.div
                key="deploying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 py-2"
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="text-xl"
                >🌿</motion.span>
                <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>
                  Sending agents out...
                </span>
              </motion.div>
            )}

            {/* Done */}
            {phase === "done" && textDone && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => { e.stopPropagation(); handleDone(); }}
                  className="px-5 py-2.5 rounded-2xl text-sm font-extrabold"
                  style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                >
                  Back to village
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
