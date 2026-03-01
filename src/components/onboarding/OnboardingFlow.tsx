"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { CompanySetup } from "./CompanySetup";
import { NeedsSelector } from "./NeedsSelector";
import { LS_USER_ID } from "@/lib/constants";
import { playClick, playChime } from "@/lib/sounds";

type OnboardingStep = "welcome" | "avatar" | "company" | "needs" | "done";

const AVATAR_OPTIONS = [
  { emoji: "🧑‍💼", label: "Founder" },
  { emoji: "👩‍🍳", label: "Chef" },
  { emoji: "🧑‍🔬", label: "Inventor" },
  { emoji: "🧑‍🌾", label: "Maker" },
  { emoji: "🧑‍🎨", label: "Creator" },
  { emoji: "🧑‍🚀", label: "Dreamer" },
];

interface Need {
  category: string;
  description: string;
  searchQuery: string;
}

const STEP_ORDER: OnboardingStep[] = ["welcome", "avatar", "company", "needs", "done"];

export function OnboardingFlow() {
  const router = useRouter();
  const setUserId = useForageStore((s) => s.setUserId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [villageName, setVillageName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🧑‍💼");
  const [analyzedNeeds, setAnalyzedNeeds] = useState<Need[]>([]);
  const [companyData, setCompanyData] = useState<{
    isNewBusiness: boolean;
    companyName?: string;
    productIdea?: string;
    website?: string;
  } | null>(null);

  const createUser = useMutation(api.users.create);
  const updateCompany = useMutation(api.users.updateCompanyData);
  const createQuest = useMutation(api.quests.create);
  const analyzeProduct = useAction(api.actions.claude.analyzeProductNeed);

  function goNext(nextStep: OnboardingStep) {
    setDirection(1);
    playClick();
    setStep(nextStep);
  }

  async function handleCompanySetup(data: {
    isNewBusiness: boolean;
    companyName?: string;
    companyDescription?: string;
    productIdea?: string;
    website?: string;
  }) {
    setCompanyData(data);
    if (data.isNewBusiness && data.productIdea) {
      const needs = await analyzeProduct({ productIdea: data.productIdea });
      setAnalyzedNeeds(needs);
    }
    goNext("needs");
  }

  async function handleNeedsConfirmed(selectedNeeds: Need[]) {
    const userId = await createUser({
      name: name || "Founder",
      avatar: selectedAvatar,
      villageName: villageName || "My Village",
      isNewBusiness: companyData?.isNewBusiness ?? false,
    });

    await updateCompany({
      userId,
      companyName: companyData?.companyName,
      website: companyData?.website,
      isNewBusiness: companyData?.isNewBusiness,
      needs: selectedNeeds.map((n) => n.category),
    });

    let firstQuestId = null;
    for (const need of selectedNeeds) {
      const questId = await createQuest({
        userId,
        description: need.searchQuery || `Find ${need.category} vendors`,
      });
      if (!firstQuestId) firstQuestId = questId;
    }

    localStorage.setItem(LS_USER_ID, userId);
    setUserId(userId);
    if (firstQuestId) setActiveQuestId(firstQuestId);

    playChime();
    setStep("done");
    setTimeout(() => router.push("/village"), 1800);
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center"
    >
      {/* Sky background */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "45%",
          background: "linear-gradient(180deg, #C9E8FF 0%, #87CEEB 100%)",
          zIndex: 0,
        }}
      />
      {/* Animated clouds */}
      <div className="cloud-float absolute" style={{ top: "6%", left: "5%", zIndex: 1 }}>
        <div style={{ position: "relative", width: 80, height: 32 }}>
          <div style={{ position: "absolute", top: 8, left: 0, width: 44, height: 22, background: "rgba(255,255,255,0.85)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: 0, left: 16, width: 36, height: 28, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: 7, left: 40, width: 30, height: 20, background: "rgba(255,255,255,0.8)", borderRadius: "50%" }} />
        </div>
      </div>
      <div className="cloud-float-slow absolute" style={{ top: "10%", right: "8%", zIndex: 1 }}>
        <div style={{ position: "relative", width: 64, height: 26 }}>
          <div style={{ position: "absolute", top: 6, left: 0, width: 36, height: 18, background: "rgba(255,255,255,0.82)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: 0, left: 13, width: 30, height: 24, background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: 5, left: 32, width: 24, height: 16, background: "rgba(255,255,255,0.78)", borderRadius: "50%" }} />
        </div>
      </div>

      {/* Grass background */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: "43%",
          background: "radial-gradient(ellipse at 50% 0%, #7EC850 0%, #5BA832 100%)",
          zIndex: 0,
        }}
      />

      {/* Decorative edge trees */}
      {[
        { left: "2%", bottom: "5%", size: "3rem" },
        { left: "8%", bottom: "0%", size: "3.5rem" },
        { right: "3%", bottom: "5%", size: "3rem" },
        { right: "9%", bottom: "0%", size: "3.5rem" },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{ ...pos, fontSize: pos.size, zIndex: 1 }}
        >
          🌲
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="text-center mb-6"
        >
          <div className="text-6xl mb-2">🌿</div>
          <h1
            className="text-5xl font-bold drop-shadow-md"
            style={{
              color: "var(--primary-dark)",
              fontFamily: "var(--font-fredoka, 'Fredoka One', cursive)",
              textShadow: "0 2px 0 rgba(255,255,255,0.7)",
            }}
          >
            Forage
          </h1>
          <p className="text-sm font-bold mt-1" style={{ color: "#2a5c1e", textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>
            Find vendors. Build your product.
          </p>
        </motion.div>

        {/* Card */}
        <div
          className="w-full rounded-3xl p-6 shadow-2xl overflow-hidden"
          style={{
            background: "var(--cream)",
            border: "3.5px solid var(--primary)",
            boxShadow: "0 8px 32px rgba(61,138,53,0.25)",
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            >
              {step === "welcome" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>
                    Welcome to Forage 👋
                  </h2>
                  <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                    Your AI agent forages the real world for vendors so you can build physical products.
                    Each vendor becomes an animal NPC in your village!
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 text-sm outline-none font-semibold"
                      style={{
                        background: "var(--panel)",
                        border: "2.5px solid var(--border-game)",
                        borderRadius: 14,
                        color: "var(--text)",
                      }}
                    />
                    <input
                      type="text"
                      value={villageName}
                      onChange={(e) => setVillageName(e.target.value)}
                      placeholder="Your village name (e.g. Kombucha Valley)"
                      className="w-full px-4 py-3 text-sm outline-none font-semibold"
                      style={{
                        background: "var(--panel)",
                        border: "2.5px solid var(--border-game)",
                        borderRadius: 14,
                        color: "var(--text)",
                      }}
                    />
                  </div>
                  <motion.button
                    onClick={() => goNext("avatar")}
                    disabled={!name.trim()}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 font-extrabold text-sm disabled:opacity-40 transition-colors"
                    style={{
                      background: "var(--primary)",
                      color: "white",
                      border: "2.5px solid var(--primary-dark)",
                      borderRadius: 14,
                    }}
                  >
                    Get started →
                  </motion.button>
                </div>
              )}

              {step === "avatar" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>
                    Pick your avatar, {name} 🎭
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {AVATAR_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.emoji}
                        onClick={() => setSelectedAvatar(opt.emoji)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 rounded-2xl flex flex-col items-center gap-1 transition-all"
                        style={{
                          background: selectedAvatar === opt.emoji ? "var(--primary)" : "var(--panel)",
                          border: selectedAvatar === opt.emoji ? "3px solid var(--primary-dark)" : "2.5px solid var(--border-game)",
                          boxShadow: selectedAvatar === opt.emoji ? "0 2px 8px rgba(91,173,78,0.35)" : undefined,
                        }}
                      >
                        <span className="text-3xl">{opt.emoji}</span>
                        <span
                          className="text-xs font-bold"
                          style={{ color: selectedAvatar === opt.emoji ? "white" : "var(--muted)" }}
                        >
                          {opt.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  <motion.button
                    onClick={() => goNext("company")}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 font-extrabold text-sm transition-colors"
                    style={{
                      background: "var(--primary)",
                      color: "white",
                      border: "2.5px solid var(--primary-dark)",
                      borderRadius: 14,
                    }}
                  >
                    Continue →
                  </motion.button>
                </div>
              )}

              {step === "company" && (
                <CompanySetup onComplete={handleCompanySetup} />
              )}

              {step === "needs" && (
                <NeedsSelector
                  needs={
                    analyzedNeeds.length > 0
                      ? analyzedNeeds
                      : [
                          { category: "Manufacturer", description: "Find manufacturers for your product", searchQuery: "manufacturers for my product" },
                          { category: "Packaging", description: "Packaging and label printing", searchQuery: "custom packaging suppliers" },
                          { category: "Distribution", description: "Shipping and distribution partners", searchQuery: "product distribution partners" },
                        ]
                  }
                  onConfirm={handleNeedsConfirmed}
                />
              )}

              {step === "done" && (
                <div className="text-center py-8">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h2 className="text-xl font-extrabold mb-2" style={{ color: "var(--primary-dark)" }}>
                    Your village is ready!
                  </h2>
                  <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                    Heading to your village...
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2.5 mt-5">
          {(["welcome", "avatar", "company", "needs"] as OnboardingStep[]).map((s) => {
            const idx = STEP_ORDER.indexOf(s);
            const curIdx = STEP_ORDER.indexOf(step);
            const isActive = s === step;
            const isPast = idx < curIdx;
            return (
              <motion.div
                key={s}
                animate={{ scale: isActive ? 1.4 : 1 }}
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: isActive
                    ? "var(--primary)"
                    : isPast
                    ? "var(--primary-dark)"
                    : "var(--border-game)",
                  opacity: isPast ? 0.5 : 1,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
