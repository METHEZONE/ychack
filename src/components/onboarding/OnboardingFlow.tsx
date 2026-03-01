"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { CompanySetup } from "./CompanySetup";
import { NeedsSelector } from "./NeedsSelector";
import { LS_USER_ID } from "@/lib/constants";

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

export function OnboardingFlow() {
  const router = useRouter();
  const setUserId = useForageStore((s) => s.setUserId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);

  const [step, setStep] = useState<OnboardingStep>("welcome");
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

  async function handleCompanySetup(data: {
    isNewBusiness: boolean;
    companyName?: string;
    companyDescription?: string;
    productIdea?: string;
    website?: string;
  }) {
    setCompanyData(data);

    if (data.isNewBusiness && data.productIdea) {
      // Analyze product idea into supply chain needs
      const needs = await analyzeProduct({ productIdea: data.productIdea });
      setAnalyzedNeeds(needs);
      setStep("needs");
    } else {
      setStep("needs");
    }
  }

  async function handleNeedsConfirmed(selectedNeeds: Need[]) {
    // Create user in Convex
    const userId = await createUser({
      name: name || "Founder",
      avatar: selectedAvatar,
      villageName: villageName || "My Village",
      isNewBusiness: companyData?.isNewBusiness ?? false,
    });

    // Update company data
    await updateCompany({
      userId,
      companyName: companyData?.companyName,
      website: companyData?.website,
      isNewBusiness: companyData?.isNewBusiness,
      needs: selectedNeeds.map((n) => n.category),
    });

    // Create quests for each selected need
    let firstQuestId = null;
    for (const need of selectedNeeds) {
      const questId = await createQuest({
        userId,
        description: need.searchQuery || `Find ${need.category} vendors`,
      });
      if (!firstQuestId) firstQuestId = questId;
    }

    // Save to local storage + store
    localStorage.setItem(LS_USER_ID, userId);
    setUserId(userId);
    if (firstQuestId) setActiveQuestId(firstQuestId);

    setStep("done");
    setTimeout(() => router.push("/village"), 1500);
  }

  return (
    <div
      className="w-full max-w-md mx-auto px-4 py-8"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🌿</div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Forage
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Find vendors. Build your product.
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-3xl p-6 shadow-lg"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {step === "welcome" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Welcome to Forage
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Your AI agent forages the real world for vendors so you can build physical products.
              Each vendor becomes an animal NPC in your village.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--background)",
                  border: "1.5px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <input
                type="text"
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                placeholder="Your village name (e.g. Kombucha Valley)"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--background)",
                  border: "1.5px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <button
              onClick={() => setStep("avatar")}
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors"
              style={{ background: "var(--primary)", color: "white" }}
            >
              Get started →
            </button>
          </div>
        )}

        {step === "avatar" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Pick your avatar, {name}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.emoji}
                  onClick={() => setSelectedAvatar(opt.emoji)}
                  className="p-3 rounded-2xl flex flex-col items-center gap-1 transition-all hover:scale-105"
                  style={{
                    background:
                      selectedAvatar === opt.emoji
                        ? "var(--primary)"
                        : "var(--background)",
                    border:
                      selectedAvatar === opt.emoji
                        ? "2px solid var(--primary)"
                        : "1.5px solid var(--border)",
                  }}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: selectedAvatar === opt.emoji ? "white" : "var(--muted)",
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("company")}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-colors"
              style={{ background: "var(--primary)", color: "white" }}
            >
              Continue →
            </button>
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
                    {
                      category: "Manufacturer",
                      description: "Find manufacturers for your product",
                      searchQuery: "manufacturers for my product",
                    },
                    {
                      category: "Packaging",
                      description: "Packaging and label printing",
                      searchQuery: "custom packaging suppliers",
                    },
                    {
                      category: "Distribution",
                      description: "Shipping and distribution partners",
                      searchQuery: "product distribution partners",
                    },
                  ]
            }
            onConfirm={handleNeedsConfirmed}
          />
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              Your village is ready!
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Heading to your village...
            </p>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-6">
        {(["welcome", "avatar", "company", "needs"] as OnboardingStep[]).map((s) => (
          <div
            key={s}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background:
                s === step
                  ? "var(--primary)"
                  : ["welcome", "avatar", "company", "needs"].indexOf(s) <
                    ["welcome", "avatar", "company", "needs"].indexOf(step)
                  ? "var(--muted)"
                  : "var(--border)",
              transform: s === step ? "scale(1.3)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
