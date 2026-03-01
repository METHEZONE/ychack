"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useAction } from "convex/react";
import { signIn } from "next-auth/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { LS_USER_ID } from "@/lib/constants";
import { playDialogueBlip, playChime, playClick } from "@/lib/sounds";
import { ANIMAL_EMOJI, ANIMAL_COLORS, ANIMAL_TYPES, AnimalType, assignAnimal } from "@/lib/animals";
import { getSpriteSheet } from "@/lib/sprites";
import { Id } from "../../../convex/_generated/dataModel";

// ── Types ────────────────────────────────────────────────────────────────────

interface GoogleUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  googleId?: string | null;
}

export interface PendingOnboardData {
  name: string;
  email?: string;
  companyName?: string;
  companyDescription?: string;
  productionScale?: string;
  timeline?: string;
  geoPreference?: string;
  needs: string[];
}

interface OnboardingFlowProps {
  googleUser?: GoogleUser | null;
  pendingData?: PendingOnboardData | null;
}

// ── Steps (same as GomiDataCollect) ──────────────────────────────────────────

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

const DEFAULT_NEEDS = ["Manufacturer", "Packaging", "Distribution", "Raw Materials"];

// ── Sprite Portrait ──────────────────────────────────────────────────────────

function SpritePortrait({ charType, frameIdx, displayH = 150 }: {
  charType: string;
  frameIdx: number;
  displayH?: number;
}) {
  const sheet = getSpriteSheet(charType);
  if (!sheet) {
    return <div style={{ height: displayH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>🐻</div>;
  }
  const f = sheet.frames[frameIdx] ?? sheet.frames[0];
  const scale = displayH / f.h;
  return (
    <div
      style={{
        width: f.w * scale,
        height: displayH,
        backgroundImage: `url('${sheet.src}')`,
        backgroundPosition: `-${f.x * scale}px -${f.y * scale}px`,
        backgroundSize: `${sheet.sheetW * scale}px ${sheet.sheetH * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        flexShrink: 0,
      }}
    />
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

type Phase = "intro" | "collecting" | "needs" | "login" | "creating" | "done";

export function OnboardingFlow({ googleUser, pendingData }: OnboardingFlowProps) {
  const router = useRouter();
  const setUserId = useForageStore((s) => s.setUserId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);

  // Phase
  const [phase, setPhase] = useState<Phase>(pendingData ? "creating" : "intro");

  // Collecting state
  const [stepIdx, setStepIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Needs
  const [selectedNeedIdxs, setSelectedNeedIdxs] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  // Login
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);

  // Typewriter
  const [displayText, setDisplayText] = useState("");
  const [textDone, setTextDone] = useState(false);
  const typeIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Convex mutations
  const createUser = useMutation(api.users.create);
  const updateCompany = useMutation(api.users.updateCompanyData);
  const setGoogleId = useMutation(api.users.setGoogleId);
  const setSessionToken = useMutation(api.users.setSessionToken);
  const createQuest = useMutation(api.quests.create);
  const updatePrefs = useMutation(api.users.updatePreferences);
  const autoForage = useAction(api.actions.forage.autoForageOnboarding);

  // ── Resolve gomi text ────────────────────────────────────────────────────
  const resolveGomiText = useCallback((step: CollectStep) => {
    if (typeof step.gomiText === "function") return step.gomiText(answers);
    return step.gomiText;
  }, [answers]);

  const getCurrentText = useCallback(() => {
    if (phase === "intro") {
      return "Hey there! Welcome to Forage Village. I'm Gomi, the mayor around here. Before we get started, I'd love to learn a bit about you!";
    }
    if (phase === "collecting") {
      const step = ALL_STEPS[stepIdx];
      return step ? resolveGomiText(step) : "";
    }
    if (phase === "needs") {
      return "Almost there! Pick which agents you'd like to deploy — each one will forage the web for different types of vendors!";
    }
    if (phase === "login") {
      return "Everything's set! One last thing — save your village so you can come back anytime!";
    }
    if (phase === "creating") {
      return "Setting up your village and deploying agents...";
    }
    if (phase === "done") {
      return "Your village is ready! Heading there now... 🎉";
    }
    return "";
  }, [phase, stepIdx, resolveGomiText]);

  // ── Typewriter effect ────────────────────────────────────────────────────
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
  }, [textDone, phase, stepIdx]);

  function skipTypewriter() {
    if (!textDone) {
      const fullText = getCurrentText();
      typeIndexRef.current = fullText.length;
      setDisplayText(fullText);
      setTextDone(true);
    }
  }

  // ── finishOnboarding ─────────────────────────────────────────────────────
  async function finishOnboarding(data: {
    name: string;
    email?: string;
    companyName?: string;
    companyDescription?: string;
    productionScale?: string;
    timeline?: string;
    geoPreference?: string;
    needs: string[];
  }, gUser?: GoogleUser | null) {
    const userId = await createUser({
      name: data.name || "Founder",
      avatar: "milo",
      villageName: "My Village",
    });

    await updateCompany({
      userId,
      email: data.email || undefined,
      companyName: data.companyName || undefined,
      companyDescription: data.companyDescription || undefined,
      productionScale: data.productionScale || undefined,
      timeline: data.timeline || undefined,
      geoPreference: data.geoPreference || undefined,
      needs: data.needs,
      gomiOnboardingDone: true,
    });

    // Link Google identity
    const gid = gUser?.googleId;
    if (gid) {
      await setGoogleId({ userId, googleId: gid });
    }

    // Session token
    const token = crypto.randomUUID();
    await setSessionToken({ userId, sessionToken: token });
    try {
      await fetch("/api/auth/local-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionToken: token }),
      });
    } catch { /* non-critical */ }

    // Create quests for selected needs
    let firstQuestId: Id<"quests"> | null = null;
    for (let i = 0; i < data.needs.length; i++) {
      const { animalType, characterName } = assignAnimal(i);
      const qId = await createQuest({
        userId,
        description: `Find ${data.needs[i]} vendors`,
        animalType,
        characterName,
      });
      if (!firstQuestId) firstQuestId = qId;
    }

    if (firstQuestId) {
      await updatePrefs({ userId, activeQuestId: firstQuestId });
      setActiveQuestId(firstQuestId);
    }

    // Fire-and-forget auto-forage
    autoForage({ userId }).catch(() => {});

    localStorage.setItem(LS_USER_ID, userId);
    localStorage.removeItem("forage_pending_onboard");
    setUserId(userId);

    return userId;
  }

  // ── Auto-complete on return from Google OAuth ────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingData || !googleUser?.name) return;
    const t = setTimeout(async () => {
      try {
        setPhase("creating");
        await finishOnboarding({
          name: pendingData.name,
          email: googleUser?.email || pendingData.email || undefined,
          companyName: pendingData.companyName,
          companyDescription: pendingData.companyDescription,
          productionScale: pendingData.productionScale,
          timeline: pendingData.timeline,
          geoPreference: pendingData.geoPreference,
          needs: pendingData.needs,
        }, googleUser);
        playChime();
        setPhase("done");
        setTimeout(() => router.push("/village"), 1800);
      } catch (e) {
        console.error("Auto-complete failed:", e);
      }
    }, 700);
    return () => clearTimeout(t);
  }, []); // run once on mount

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleStartCollecting() {
    playClick();
    setPhase("collecting");
    setStepIdx(0);
    setInputValue("");
  }

  function handleSubmitStep() {
    const step = ALL_STEPS[stepIdx];
    if (!step || !inputValue.trim()) return;

    playClick();
    const newAnswers = { ...answers, [step.key]: inputValue.trim() };
    setAnswers(newAnswers);

    if (stepIdx < ALL_STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
      setInputValue("");
    } else {
      playChime();
      setPhase("needs");
    }
  }

  function toggleNeed(idx: number) {
    playClick();
    setSelectedNeedIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function handleNeedsDone() {
    playClick();
    setPhase("login");
  }

  async function handleSaveLocal() {
    playClick();
    setSavingLocal(true);
    const selectedNeeds = DEFAULT_NEEDS.filter((_, i) => selectedNeedIdxs.has(i));
    try {
      setPhase("creating");
      await finishOnboarding({
        name: answers.name || "Founder",
        email: answers.email,
        companyName: answers.companyName,
        companyDescription: answers.companyDescription,
        productionScale: answers.productionScale,
        timeline: answers.timeline,
        geoPreference: answers.geoPreference,
        needs: selectedNeeds,
      });
      playChime();
      setPhase("done");
      setTimeout(() => router.push("/village"), 1800);
    } catch (e) {
      console.error(e);
      setSavingLocal(false);
      setPhase("login");
    }
  }

  function handleGoogleSave() {
    playClick();
    setSavingGoogle(true);
    const selectedNeeds = DEFAULT_NEEDS.filter((_, i) => selectedNeedIdxs.has(i));
    const pending: PendingOnboardData = {
      name: answers.name || "Founder",
      email: answers.email,
      companyName: answers.companyName,
      companyDescription: answers.companyDescription,
      productionScale: answers.productionScale,
      timeline: answers.timeline,
      geoPreference: answers.geoPreference,
      needs: selectedNeeds,
    };
    localStorage.setItem("forage_pending_onboard", JSON.stringify(pending));
    signIn("google", { callbackUrl: "/" });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitStep();
    }
  }

  // ── Progress ─────────────────────────────────────────────────────────────
  const totalSteps = ALL_STEPS.length + 1; // +1 for needs
  const currentProgress =
    phase === "collecting" ? Math.round(((stepIdx + 1) / totalSteps) * 100) :
    phase === "needs" ? Math.round((ALL_STEPS.length / totalSteps) * 100) :
    100;

  const currentStep = ALL_STEPS[stepIdx];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col"
      style={{ minHeight: "100vh" }}
      onClick={skipTypewriter}
    >
      {/* Background: intro-bg.png fullscreen */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/intro-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex: 0 }}
        draggable={false}
      />
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.65) 100%)",
          zIndex: 1,
        }}
      />

      {/* Spacer pushes dialogue to bottom */}
      <div className="flex-1" />

      {/* ── Dialogue box (bottom of screen, visual novel style) ── */}
      <div
        className="relative w-full"
        style={{ zIndex: 10 }}
      >
        {/* Progress bar (collecting / needs phases) */}
        {(phase === "collecting" || phase === "needs") && (
          <div className="px-6 pb-2">
            <div className="flex items-center gap-3">
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #5BAD4E, #8FD47A)" }}
                  animate={{ width: `${currentProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span
                className="text-xs font-bold"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {phase === "collecting" ? `${stepIdx + 1}/${totalSteps}` : `${ALL_STEPS.length}/${totalSteps}`}
              </span>
            </div>
          </div>
        )}

        {/* Dialogue panel */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(20,15,10,0.88) 0%, rgba(10,8,5,0.95) 100%)",
            backdropFilter: "blur(20px)",
            borderTop: "3px solid rgba(91,173,78,0.6)",
            padding: "0 0 env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="flex gap-4 px-5 pt-4 pb-5 max-w-2xl mx-auto">
            {/* Gomi avatar */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, rgba(91,173,78,0.2) 0%, rgba(91,173,78,0.08) 100%)",
                  border: "2.5px solid rgba(91,173,78,0.5)",
                }}
              >
                <SpritePortrait charType="bear" frameIdx={0} displayH={56} />
              </motion.div>
              <div
                className="text-xs font-extrabold text-center px-2.5 py-0.5 rounded-full"
                style={{ background: "#5BAD4E", color: "white" }}
              >
                Gomi
              </div>
              <div
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(91,173,78,0.15)",
                  color: "#8FD47A",
                  border: "1.5px solid rgba(91,173,78,0.3)",
                }}
              >
                Mayor
              </div>
            </div>

            {/* Text + interaction */}
            <div className="flex-1 min-w-0">
              {/* Dialogue text */}
              <div
                className="text-sm font-semibold leading-relaxed mb-3 min-h-[48px]"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                {displayText}
                {!textDone && (
                  <span className="typewriter-cursor" style={{ color: "#8FD47A" }}>▌</span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {/* ── Intro ── */}
                {phase === "intro" && textDone && (
                  <motion.div
                    key="intro-btn"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <VNButton onClick={(e) => { e.stopPropagation(); handleStartCollecting(); }}>
                      Let&apos;s go!
                    </VNButton>
                  </motion.div>
                )}

                {/* ── Collecting ── */}
                {phase === "collecting" && textDone && currentStep && (
                  <motion.div
                    key={`step-${stepIdx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2.5"
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
                        className="w-full text-sm leading-relaxed p-3 rounded-xl outline-none resize-none font-semibold"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "2px solid rgba(255,255,255,0.15)",
                          color: "rgba(255,255,255,0.95)",
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
                        className="w-full text-sm p-3 rounded-xl outline-none font-semibold"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "2px solid rgba(255,255,255,0.15)",
                          color: "rgba(255,255,255,0.95)",
                        }}
                      />
                    )}
                    <div className="flex gap-2">
                      <VNButton
                        onClick={handleSubmitStep}
                        disabled={!inputValue.trim()}
                      >
                        Next →
                      </VNButton>
                      {stepIdx > 0 && (
                        <VNButton
                          onClick={() => { playClick(); setStepIdx(stepIdx - 1); setInputValue(""); }}
                          secondary
                        >
                          ← Back
                        </VNButton>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── Needs / Agent Selection ── */}
                {phase === "needs" && textDone && (
                  <motion.div
                    key="needs"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {DEFAULT_NEEDS.map((need, i) => {
                        const { animalType, characterName } = assignAnimal(i);
                        const emoji = ANIMAL_EMOJI[animalType as AnimalType] ?? "🐾";
                        const color = ANIMAL_COLORS[animalType as AnimalType] ?? "#888";
                        const checked = selectedNeedIdxs.has(i);

                        return (
                          <motion.button
                            key={i}
                            onClick={() => toggleNeed(i)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left"
                            style={{
                              background: checked ? `${color}20` : "rgba(255,255,255,0.05)",
                              border: `2px solid ${checked ? color : "rgba(255,255,255,0.12)"}`,
                              transition: "all 0.15s",
                            }}
                          >
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-black"
                              style={{
                                background: checked ? color : "transparent",
                                border: `2px solid ${checked ? color : "rgba(255,255,255,0.25)"}`,
                                color: "white",
                              }}
                            >
                              {checked ? "✓" : ""}
                            </div>
                            <span className="text-lg flex-shrink-0">{emoji}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
                                {characterName}
                              </div>
                              <div className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                                {need}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    <VNButton
                      onClick={handleNeedsDone}
                      disabled={selectedNeedIdxs.size === 0}
                    >
                      Deploy {selectedNeedIdxs.size} agent{selectedNeedIdxs.size !== 1 ? "s" : ""} 🌿
                    </VNButton>
                  </motion.div>
                )}

                {/* ── Login ── */}
                {phase === "login" && textDone && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Google */}
                    <motion.button
                      onClick={handleGoogleSave}
                      disabled={savingGoogle}
                      whileHover={!savingGoogle ? { scale: 1.02 } : {}}
                      whileTap={!savingGoogle ? { scale: 0.97 } : {}}
                      className="flex items-center justify-center gap-2.5 w-full px-5 py-3 rounded-xl font-extrabold text-sm"
                      style={{
                        background: "white",
                        color: "#1f1f1f",
                        border: "none",
                        cursor: savingGoogle ? "wait" : "pointer",
                        opacity: savingGoogle ? 0.7 : 1,
                      }}
                    >
                      {savingGoogle ? (
                        <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>🌿</motion.span> Redirecting...</>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                            <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
                            <path fill="#FBBC05" d="M24 46c5.9 0 10.9-2 14.5-5.4l-6.7-5.5C29.8 36.9 27 38 24 38c-6 0-11.1-4-12.9-9.5l-7 5.4C7.9 41.5 15.4 46 24 46z"/>
                            <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.4-2.5 4.5-4.7 5.9l6.7 5.5C42 36.6 45 31 45 24c0-1.3-.2-2.7-.5-4z"/>
                          </svg>
                          Save with Google
                        </>
                      )}
                    </motion.button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
                      <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>or</span>
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
                    </div>

                    <VNButton
                      onClick={handleSaveLocal}
                      disabled={savingLocal}
                      secondary
                    >
                      {savingLocal
                        ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>🌿</motion.span> Setting up...</>
                        : "Start locally"
                      }
                    </VNButton>

                    <p className="text-center text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Local mode saves to this browser only
                    </p>
                  </motion.div>
                )}

                {/* ── Creating ── */}
                {phase === "creating" && (
                  <motion.div
                    key="creating"
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
                    <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Building your village...
                    </span>
                  </motion.div>
                )}

                {/* ── Done ── */}
                {phase === "done" && textDone && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 py-2"
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6 }}
                      className="text-3xl"
                    >🎉</motion.div>
                    <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>
                      Heading to your village...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Visual Novel Button ──────────────────────────────────────────────────────

function VNButton({
  onClick,
  disabled,
  children,
  secondary,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      className="px-5 py-2.5 rounded-xl text-sm font-extrabold disabled:opacity-50"
      style={{
        background: secondary
          ? "rgba(255,255,255,0.08)"
          : "linear-gradient(180deg, #5BAD4E 0%, #3D8A35 100%)",
        color: secondary ? "rgba(255,255,255,0.7)" : "white",
        border: secondary
          ? "2px solid rgba(255,255,255,0.15)"
          : "2px solid #2D6A27",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </motion.button>
  );
}
