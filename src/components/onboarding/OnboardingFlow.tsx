"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useAction } from "convex/react";
import { signIn } from "next-auth/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { LS_USER_ID } from "@/lib/constants";
import { playClick, playChime } from "@/lib/sounds";
import { getSpriteSheet } from "@/lib/sprites";

// ── Types ────────────────────────────────────────────────────────────────────
type OnboardingStep = "character" | "company" | "needs" | "account" | "done";

interface Need {
  category: string;
  description: string;
  searchQuery: string;
}

interface GoogleUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface PendingOnboardData {
  name: string;
  villageName: string;
  charType: string;
  companyData: {
    isNewBusiness: boolean;
    companyName?: string;
    productIdea?: string;
    website?: string;
  } | null;
  needs: Need[];
}

interface OnboardingFlowProps {
  googleUser?: GoogleUser | null;
  pendingData?: PendingOnboardData | null;
}

// ── Characters ───────────────────────────────────────────────────────────────
const CHARACTERS = [
  { type: "fox",    label: "Foxi",  portraitFrame: 0 },
  { type: "rabbit", label: "Rabi",  portraitFrame: 0 },
  { type: "bear",   label: "Gomi",  portraitFrame: 0 },
  { type: "deer",   label: "Deer",  portraitFrame: 0 },
  { type: "milo",   label: "Milo",  portraitFrame: 0 },
  { type: "lion",   label: "Leon",  portraitFrame: 1 },
];

// ── Stardew Valley palette ───────────────────────────────────────────────────
const SD = {
  panel:       "#f2e4b0",
  panelDark:   "#e0d090",
  border:      "#5c3010",
  borderGold:  "#c87828",
  text:        "#2c1808",
  muted:       "#7a5528",
  input:       "#f8f0c8",
  portrait:    "linear-gradient(180deg, #a0d8f0 0%, #60a8c8 100%)",
};

const DEFAULT_NEEDS: Need[] = [
  { category: "Manufacturer", description: "Find manufacturers for your product", searchQuery: "product manufacturers" },
  { category: "Packaging",    description: "Packaging and label printing",         searchQuery: "custom packaging suppliers" },
  { category: "Distribution", description: "Shipping and logistics partners",      searchQuery: "product distribution partners" },
  { category: "Raw Materials", description: "Source raw material suppliers",       searchQuery: "raw material suppliers" },
];

// ── Sub-components ───────────────────────────────────────────────────────────
function SpritePortrait({ charType, frameIdx, displayH = 150 }: {
  charType: string;
  frameIdx: number;
  displayH?: number;
}) {
  const sheet = getSpriteSheet(charType);
  if (!sheet) {
    return <div style={{ height: displayH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>🌿</div>;
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

function SdBtn({
  onClick, disabled, children, secondary, fullWidth,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  secondary?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.03, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.97, y: 1 }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: fullWidth ? "100%" : undefined,
        background: secondary
          ? SD.panel
          : `linear-gradient(180deg, #d49030 0%, #a05c18 100%)`,
        color: secondary ? SD.text : "#fff8e0",
        border: `3px solid ${SD.border}`,
        boxShadow: secondary ? `0 3px 0 #8a6820` : `0 3px 0 #3c1808`,
        borderRadius: 4,
        padding: "10px 20px",
        fontWeight: 800,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        transition: "opacity 0.15s",
      }}
    >
      {children}
    </motion.button>
  );
}

function SdInput({ value, onChange, placeholder, type = "text", multiline, rows }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const style: React.CSSProperties = {
    width: "100%",
    background: SD.input,
    border: `3px solid ${SD.border}`,
    borderRadius: 4,
    padding: "10px 14px",
    color: SD.text,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    resize: multiline ? "none" : undefined,
  };
  if (multiline) {
    return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows ?? 4} style={style} />;
  }
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />;
}

function SdLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: SD.muted, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
      {children}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function OnboardingFlow({ googleUser, pendingData }: OnboardingFlowProps) {
  const router = useRouter();
  const setUserId = useForageStore((s) => s.setUserId);
  const setActiveQuestId = useForageStore((s) => s.setActiveQuestId);

  const initialStep: OnboardingStep = pendingData ? "account" : "character";
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [dir, setDir] = useState(1);

  // Personal
  const [name, setName] = useState(pendingData?.name ?? googleUser?.name ?? "");
  const [villageName, setVillageName] = useState(pendingData?.villageName ?? "");

  // Company
  const [companyMode, setCompanyMode] = useState<"choose" | "existing" | "new">("choose");
  const [website, setWebsite] = useState("");
  const [productIdea, setProductIdea] = useState("");
  const [companyData, setCompanyData] = useState<PendingOnboardData["companyData"]>(pendingData?.companyData ?? null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");

  // Needs
  const [analyzedNeeds, setAnalyzedNeeds] = useState<Need[]>([]);
  const [selectedNeedIdxs, setSelectedNeedIdxs] = useState<Set<number>>(new Set([0, 1, 2]));
  const [needsAnalyzing, setNeedsAnalyzing] = useState(false);

  // Account
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);

  const createUser   = useMutation(api.users.create);
  const updateCompany = useMutation(api.users.updateCompanyData);
  const createQuest  = useMutation(api.quests.create);
  const scrapeWebsite = useAction(api.actions.browserUse.scrapeWebsite);
  const analyzeProduct = useAction(api.actions.claude.analyzeProductNeed);

  const charType = "milo";
  const charPortraitFrame = 0;
  const displayedNeeds = analyzedNeeds.length > 0 ? analyzedNeeds : DEFAULT_NEEDS;

  function goNext(s: OnboardingStep) { setDir(1); playClick(); setStep(s); }

  // ── Convex: create user + quests ──────────────────────────────────────────
  async function finishOnboarding(needs: Need[]) {
    const userId = await createUser({
      name: name || "Founder",
      avatar: charType,
      villageName: villageName || "My Village",
      isNewBusiness: companyData?.isNewBusiness ?? false,
    });
    await updateCompany({
      userId,
      companyName: companyData?.companyName,
      website: companyData?.website,
      isNewBusiness: companyData?.isNewBusiness,
      needs: needs.map(n => n.category),
    });
    let firstQuestId = null;
    for (const need of needs) {
      const qId = await createQuest({ userId, description: need.searchQuery || `Find ${need.category} vendors` });
      if (!firstQuestId) firstQuestId = qId;
    }
    localStorage.setItem(LS_USER_ID, userId);
    localStorage.removeItem("forage_pending_onboard");
    setUserId(userId);
    if (firstQuestId) setActiveQuestId(firstQuestId);
    return userId;
  }

  // Auto-complete when returning from Google OAuth with pending data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingData || !googleUser?.name) return;
    const t = setTimeout(async () => {
      try {
        await finishOnboarding(pendingData.needs);
        playChime();
        setStep("done");
        setTimeout(() => router.push("/village"), 1800);
      } catch (e) {
        console.error("Auto-complete failed:", e);
      }
    }, 700);
    return () => clearTimeout(t);
  }, []); // run once on mount

  // ── Company handlers ───────────────────────────────────────────────────────
  async function handleExistingBiz() {
    if (!website.trim()) return;
    setCompanyLoading(true);
    setCompanyError("");
    try {
      const scraped = await scrapeWebsite({ url: website });
      setCompanyData({ isNewBusiness: false, companyName: scraped?.companyName, website });
    } catch {
      setCompanyError("Couldn't scrape — continuing anyway.");
      setCompanyData({ isNewBusiness: false, website });
    } finally {
      setCompanyLoading(false);
      goNext("needs");
    }
  }

  async function handleNewIdea() {
    if (!productIdea.trim()) return;
    setCompanyData({ isNewBusiness: true, productIdea });
    setNeedsAnalyzing(true);
    try {
      const needs = await analyzeProduct({ productIdea });
      setAnalyzedNeeds(needs);
      setSelectedNeedIdxs(new Set(needs.map((_: Need, i: number) => i)));
    } catch { /* use defaults */ }
    setNeedsAnalyzing(false);
    goNext("needs");
  }

  // ── Account handlers ───────────────────────────────────────────────────────
  async function handleSaveLocal() {
    setSavingLocal(true);
    const needs = displayedNeeds.filter((_, i) => selectedNeedIdxs.has(i));
    try {
      await finishOnboarding(needs);
      playChime();
      setStep("done");
      setTimeout(() => router.push("/village"), 1800);
    } catch (e) {
      console.error(e);
      setSavingLocal(false);
    }
  }

  function handleGoogleSave() {
    playClick();
    setSavingGoogle(true);
    const needs = displayedNeeds.filter((_, i) => selectedNeedIdxs.has(i));
    const pending: PendingOnboardData = { name, villageName, charType, companyData, needs };
    localStorage.setItem("forage_pending_onboard", JSON.stringify(pending));
    signIn("google", { callbackUrl: "/" });
  }

  // ── Animation ──────────────────────────────────────────────────────────────
  const STEPS: OnboardingStep[] = ["character", "company", "needs", "account"];
  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0 }),
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full relative overflow-auto flex flex-col items-center justify-center py-6" style={{ minHeight: "100vh" }}>
      {/* Background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/background.png" alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex: 0 }}
        draggable={false}
      />
      <div className="absolute inset-0" style={{ background: "rgba(80,40,5,0.55)", zIndex: 1 }} />

      {/* ── Main card ── */}
      <div
        className="relative w-full mx-4"
        style={{
          zIndex: 10,
          maxWidth: 440,
          background: SD.panel,
          border: `5px solid ${SD.border}`,
          boxShadow: `inset 0 0 0 2px ${SD.borderGold}, 0 20px 60px rgba(0,0,0,0.7)`,
          borderRadius: 8,
        }}
      >
        {/* Card header */}
        <div style={{ background: SD.border, padding: "10px 20px", borderBottom: `3px solid ${SD.borderGold}`, borderRadius: "2px 2px 0 0" }}>
          <h1
            style={{
              color: "#fff8e0",
              fontFamily: "var(--font-fredoka, 'Fredoka One', cursive)",
              fontSize: "1.5rem",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            🌿 Forage
          </h1>
        </div>

        {/* Card body */}
        <div style={{ padding: "20px 22px", overflowX: "hidden" }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            >

              {/* ═══════════════════════════════════════════════════════════
                  STEP 1: CHARACTER CREATION
              ════════════════════════════════════════════════════════════ */}
              {step === "character" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Portrait section */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <SdLabel>Your Character</SdLabel>

                    {/* Portrait frame */}
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ y: { repeat: Infinity, duration: 2.5, ease: "easeInOut" } }}
                      style={{
                        background: SD.portrait,
                        border: `4px solid ${SD.border}`,
                        boxShadow: `inset 0 0 0 2px ${SD.borderGold}, 0 4px 16px rgba(0,0,0,0.4)`,
                        borderRadius: 6,
                        width: 148, height: 164,
                        display: "flex", alignItems: "flex-end", justifyContent: "center",
                        overflow: "hidden",
                        paddingBottom: 4,
                      }}
                    >
                      <SpritePortrait charType={charType} frameIdx={charPortraitFrame} displayH={154} />
                    </motion.div>

                    <span style={{ color: SD.text, fontWeight: 800, fontSize: 15, letterSpacing: "0.03em" }}>
                      Milo
                    </span>
                  </div>

                  <div style={{ height: 1, background: SD.borderGold, opacity: 0.4, margin: "0 -2px" }} />

                  {/* Form fields */}
                  <div>
                    <SdLabel>Your Name</SdLabel>
                    <SdInput value={name} onChange={setName} placeholder="e.g. Alex" />
                  </div>
                  <div>
                    <SdLabel>Village Name</SdLabel>
                    <SdInput value={villageName} onChange={setVillageName} placeholder="e.g. Kombucha Valley" />
                  </div>

                  <SdBtn onClick={() => goNext("company")} disabled={!name.trim()} fullWidth>
                    OK →
                  </SdBtn>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  STEP 2: COMPANY SETUP
              ════════════════════════════════════════════════════════════ */}
              {step === "company" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <h2 style={{ color: SD.text, fontWeight: 800, fontSize: 15, margin: "0 0 4px" }}>Tell us about your business</h2>
                    <p style={{ color: SD.muted, fontSize: 13, fontWeight: 600, margin: 0 }}>
                      Forage will find the right vendors for your situation.
                    </p>
                  </div>

                  {companyMode === "choose" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { mode: "existing" as const, icon: "🏢", title: "Existing biz", sub: "I have a website" },
                        { mode: "new" as const,      icon: "🌱", title: "New idea",     sub: "Product concept" },
                      ].map(opt => (
                        <motion.button
                          key={opt.mode}
                          onClick={() => { playClick(); setCompanyMode(opt.mode); }}
                          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                          style={{
                            background: SD.panelDark,
                            border: `3px solid ${SD.border}`,
                            boxShadow: `0 3px 0 ${SD.border}`,
                            borderRadius: 6, padding: "14px 10px",
                            cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                          }}
                        >
                          <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.icon}</div>
                          <div style={{ color: SD.text, fontWeight: 800, fontSize: 13 }}>{opt.title}</div>
                          <div style={{ color: SD.muted, fontWeight: 600, fontSize: 11, marginTop: 3 }}>{opt.sub}</div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {companyMode === "existing" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button onClick={() => setCompanyMode("choose")} style={{ color: SD.muted, background: "none", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "inherit" }}>
                        ← Back
                      </button>
                      <div>
                        <SdLabel>Your website</SdLabel>
                        <SdInput value={website} onChange={setWebsite} placeholder="https://yourcompany.com" type="url" />
                      </div>
                      {companyError && <p style={{ color: "#c04010", fontSize: 12, fontWeight: 600, margin: 0 }}>{companyError}</p>}
                      <SdBtn onClick={handleExistingBiz} disabled={companyLoading || !website.trim()} fullWidth>
                        {companyLoading ? "🌿 Analyzing…" : "Analyze website →"}
                      </SdBtn>
                    </div>
                  )}

                  {companyMode === "new" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button onClick={() => setCompanyMode("choose")} style={{ color: SD.muted, background: "none", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "inherit" }}>
                        ← Back
                      </button>
                      <div>
                        <SdLabel>Describe your product idea</SdLabel>
                        <SdInput value={productIdea} onChange={setProductIdea} placeholder="e.g. I want to launch a kombucha brand targeting health-conscious millennials…" multiline rows={4} />
                      </div>
                      <SdBtn onClick={handleNewIdea} disabled={needsAnalyzing || !productIdea.trim()} fullWidth>
                        {needsAnalyzing ? "🌿 Analyzing…" : "Break it down →"}
                      </SdBtn>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  STEP 3: NEEDS
              ════════════════════════════════════════════════════════════ */}
              {step === "needs" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <h2 style={{ color: SD.text, fontWeight: 800, fontSize: 15, margin: "0 0 4px" }}>What do you need? 🎯</h2>
                    <p style={{ color: SD.muted, fontSize: 13, fontWeight: 600, margin: 0 }}>Select what to forage for:</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {displayedNeeds.map((need, i) => {
                      const sel = selectedNeedIdxs.has(i);
                      return (
                        <motion.button
                          key={i}
                          onClick={() => {
                            playClick();
                            setSelectedNeedIdxs(prev => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              return next;
                            });
                          }}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            background: sel ? "rgba(200,160,40,0.18)" : SD.input,
                            border: `3px solid ${sel ? SD.borderGold : SD.border}`,
                            borderRadius: 6, padding: "10px 12px",
                            cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                            transition: "border-color 0.15s, background 0.15s",
                          }}
                        >
                          <div style={{
                            width: 20, height: 20, borderRadius: 3, flexShrink: 0,
                            background: sel ? SD.borderGold : SD.panel,
                            border: `2px solid ${SD.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff8e0", fontSize: 12, fontWeight: 900,
                          }}>
                            {sel ? "✓" : ""}
                          </div>
                          <div>
                            <div style={{ color: SD.text, fontWeight: 800, fontSize: 13 }}>{need.category}</div>
                            <div style={{ color: SD.muted, fontWeight: 600, fontSize: 11, marginTop: 2 }}>{need.description}</div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <SdBtn
                    onClick={() => { playClick(); goNext("account"); }}
                    disabled={selectedNeedIdxs.size === 0}
                    fullWidth
                  >
                    Start Foraging ({selectedNeedIdxs.size}) 🌿
                  </SdBtn>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  STEP 4: ACCOUNT
              ════════════════════════════════════════════════════════════ */}
              {step === "account" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <h2 style={{ color: SD.text, fontWeight: 800, fontSize: 15, margin: "0 0 4px" }}>Save your village 🏡</h2>
                    <p style={{ color: SD.muted, fontSize: 13, fontWeight: 600, margin: 0 }}>
                      Log in to return from any device, or explore locally right now.
                    </p>
                  </div>

                  {/* Google */}
                  <motion.button
                    onClick={handleGoogleSave}
                    disabled={savingGoogle}
                    whileHover={!savingGoogle ? { scale: 1.02 } : {}}
                    whileTap={!savingGoogle ? { scale: 0.97 } : {}}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      width: "100%", padding: "12px 20px",
                      background: "white", color: "#1f1f1f",
                      border: `3px solid ${SD.border}`,
                      boxShadow: `0 3px 0 ${SD.border}`,
                      borderRadius: 4, fontWeight: 800, fontSize: 14,
                      cursor: savingGoogle ? "wait" : "pointer",
                      opacity: savingGoogle ? 0.7 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {savingGoogle ? (
                      <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>🌿</motion.span> Redirecting…</>
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

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 2, background: SD.border, opacity: 0.2 }} />
                    <span style={{ color: SD.muted, fontSize: 12, fontWeight: 700 }}>or</span>
                    <div style={{ flex: 1, height: 2, background: SD.border, opacity: 0.2 }} />
                  </div>

                  <SdBtn onClick={handleSaveLocal} disabled={savingLocal} fullWidth>
                    {savingLocal
                      ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>🌿</motion.span> Setting up village…</>
                      : "🎮 Start exploring locally"}
                  </SdBtn>

                  <p style={{ color: SD.muted, fontSize: 11, fontWeight: 600, textAlign: "center", margin: 0 }}>
                    Local mode saves to this browser only
                  </p>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  DONE
              ════════════════════════════════════════════════════════════ */}
              {step === "done" && (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6 }}
                    style={{ fontSize: 64, marginBottom: 14 }}
                  >🎉</motion.div>
                  <h2 style={{ color: SD.text, fontWeight: 800, fontSize: 18, margin: "0 0 8px" }}>Your village is ready!</h2>
                  <p style={{ color: SD.muted, fontWeight: 600, fontSize: 14, margin: 0 }}>Heading to your village…</p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        {step !== "done" && (
          <div style={{
            padding: "10px 24px",
            borderTop: `2px solid ${SD.borderGold}`,
            display: "flex", justifyContent: "center", gap: 8,
            background: SD.panelDark,
            borderRadius: "0 0 2px 2px",
          }}>
            {STEPS.map((s) => {
              const idx = STEPS.indexOf(s);
              const curIdx = STEPS.indexOf(step);
              const isActive = s === step;
              const isPast = idx < curIdx;
              return (
                <motion.div
                  key={s}
                  animate={{ scale: isActive ? 1.5 : 1 }}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isActive ? SD.borderGold : isPast ? SD.border : SD.panel,
                    border: `2px solid ${SD.border}`,
                    opacity: isPast ? 0.55 : 1,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
