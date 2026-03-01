"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { LS_USER_ID } from "@/lib/constants";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { playChime, playClick, startAmbientMusic } from "@/lib/sounds";
import { getSpriteSheet } from "@/lib/sprites";

type PageMode = "loading" | "title" | "menu" | "onboarding";

const DEMO_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Morgan", "Riley"];

// ---------------------------------------------------------------------------
// About overlay
// ---------------------------------------------------------------------------
function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 50, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 24 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="w-full max-w-md mx-4 rounded-3xl p-6 shadow-2xl"
        style={{ background: "var(--cream)", border: "3.5px solid var(--primary)", maxHeight: "85vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-extrabold mb-1"
          style={{ color: "var(--primary-dark)", fontFamily: "var(--font-fredoka, 'Fredoka One', cursive)" }}
        >
          🌿 About Forage
        </h2>
        <p className="text-xs font-bold mb-4" style={{ color: "var(--muted)" }}>
          Browser Use Web Agents Hackathon · YC HQ 2026
        </p>

        <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--panel)", border: "2px solid var(--border-game)" }}>
          <h3 className="text-sm font-extrabold mb-1.5" style={{ color: "var(--primary-dark)" }}>💡 Why we built this</h3>
          <p className="text-xs font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
            AI made building software trivially easy. But creating physical products is still brutal —
            finding vendors, FDA regulations, inquiry forms, pricing negotiations.
            <br /><br />
            Forage is the AI agent that handles all of it. Each vendor becomes an animal NPC in your village.
            Your agent forages the web, fills contact forms, sends emails, negotiates — while you just walk around.
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--panel)", border: "2px solid var(--border-game)" }}>
          <h3 className="text-sm font-extrabold mb-2" style={{ color: "var(--primary-dark)" }}>🎮 Controls</h3>
          <div className="space-y-2 text-xs font-semibold" style={{ color: "var(--text)" }}>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md font-extrabold text-xs" style={{ background: "var(--accent)", color: "var(--text)", minWidth: 56, textAlign: "center" }}>WASD</span>
              Move your character around the village
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md font-extrabold text-xs" style={{ background: "var(--accent)", color: "var(--text)", minWidth: 56, textAlign: "center" }}>E / Space</span>
              Talk to NPC vendors · Enter HQ
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md font-extrabold text-xs" style={{ background: "var(--primary)", color: "white", minWidth: 56, textAlign: "center" }}>🌿 button</span>
              Launch AI vendor search agent
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md font-extrabold text-xs" style={{ background: "var(--primary)", color: "white", minWidth: 56, textAlign: "center" }}>🏡 HQ</span>
              Review vendor applications, invite to village
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--panel)", border: "2px solid var(--border-game)" }}>
          <h3 className="text-sm font-extrabold mb-1.5" style={{ color: "var(--primary-dark)" }}>🤖 How it works</h3>
          <div className="space-y-1 text-xs font-semibold" style={{ color: "var(--text)" }}>
            <div>① Tell Forage what you&apos;re building (new idea or existing product)</div>
            <div>② AI agent searches the web for real manufacturers &amp; suppliers</div>
            <div>③ Vendors appear as animal NPCs walking into your village</div>
            <div>④ Agent fills contact forms + sends cold emails on your behalf</div>
            <div>⑤ Chat with NPCs to negotiate · Track deals in your tree view</div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-extrabold text-sm"
          style={{ background: "var(--primary)", color: "white", border: "2.5px solid var(--primary-dark)" }}
        >
          Got it — let&apos;s forage! 🌿
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Decorative walking fox on title screen
// ---------------------------------------------------------------------------
function TitleSprite() {
  const sheet = getSpriteSheet("fox");
  const [frame, setFrame] = useState(0);
  const [x, setX] = useState(-12);

  useEffect(() => {
    const iv = setInterval(() => setFrame(f => (f + 1) % 4), 160);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setX(prev => (prev > 112 ? -14 : prev + 0.10)), 16);
    return () => clearInterval(iv);
  }, []);

  if (!sheet) return null;
  const f = sheet.frames[frame];
  const scale = 90 / f.h;

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${x}%`,
        bottom: "6%",
        zIndex: 5,
        width: f.w * scale,
        height: 90,
        backgroundImage: `url('${sheet.src}')`,
        backgroundPosition: `-${f.x * scale}px -${f.y * scale}px`,
        backgroundSize: `${sheet.sheetW * scale}px ${sheet.sheetH * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        opacity: 0.85,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const setUserId = useForageStore((s) => s.setUserId);
  const initFromLocalStorage = useForageStore((s) => s.initFromLocalStorage);

  const [mode, setMode] = useState<PageMode>("loading");
  const [showAbout, setShowAbout] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);

  const createUser = useMutation(api.users.create);
  const seedDemo = useMutation(api.demo.seedDemoVendors);

  // Auth + routing check
  useEffect(() => {
    if (status === "loading") return;
    initFromLocalStorage();
    const savedId = localStorage.getItem(LS_USER_ID);

    if (savedId) {
      setUserId(savedId as Parameters<typeof setUserId>[0]);
      router.replace("/village");
      return;
    }

    if (session?.user) {
      // Returning from Google OAuth → skip title, go to onboarding
      setMode("onboarding");
    } else {
      setMode("title");
    }
  }, [status, session, router, setUserId, initFromLocalStorage]);

  const triggerMusic = useCallback(() => {
    if (!musicStarted) {
      startAmbientMusic();
      setMusicStarted(true);
    }
  }, [musicStarted]);

  // Title screen: any key → menu
  const handleTitleInteract = useCallback(() => {
    if (mode !== "title") return;
    triggerMusic();
    playClick();
    setMode("menu");
  }, [mode, triggerMusic]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["F5", "F11", "F12", "Tab"].includes(e.key)) return;
      handleTitleInteract();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleTitleInteract]);

  async function handleDemo() {
    triggerMusic();
    playClick();
    setDemoLoading(true);
    try {
      const demoName = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
      const userId = await createUser({
        name: demoName,
        avatar: "🧑‍💼",
        villageName: "Demo Village",
        isNewBusiness: true,
      });
      await seedDemo({ userId });
      localStorage.setItem(LS_USER_ID, userId);
      setUserId(userId);
      playChime();
      router.push("/village");
    } catch {
      setDemoLoading(false);
    }
  }

  // Loading spinner
  if (mode === "loading") {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: "var(--grass)" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="text-5xl">
          🌿
        </motion.div>
      </div>
    );
  }

  // Onboarding (after Google auth)
  if (mode === "onboarding") {
    return (
      <main className="w-full h-screen overflow-hidden">
        <OnboardingFlow googleUser={session?.user ?? null} />
      </main>
    );
  }

  // Title + Menu (both on background.png)
  return (
    <div
      className="w-full h-screen relative overflow-hidden"
      onClick={mode === "title" ? handleTitleInteract : undefined}
      style={{ cursor: mode === "title" ? "pointer" : "default" }}
    >
      {/* Pixel art background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/background.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        style={{ zIndex: 0 }}
        draggable={false}
      />

      {/* Overlay — darker in title, slightly darker in menu */}
      <div
        className="absolute inset-0"
        style={{
          background: mode === "title"
            ? "linear-gradient(to bottom, rgba(10,20,10,0.52) 0%, rgba(10,20,10,0.18) 45%, rgba(10,20,10,0.62) 100%)"
            : "rgba(10,20,10,0.62)",
          zIndex: 1,
          transition: "background 0.5s",
        }}
      />

      {/* YC Hackathon badge — top right */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute top-4 right-4"
        style={{ zIndex: 10 }}
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold"
          style={{
            background: "#FFD04A",
            color: "#3D2B1F",
            border: "2.5px solid #C8935A",
            boxShadow: "0 3px 12px rgba(0,0,0,0.4)",
          }}
        >
          🏆 YC Hackathon · Browser Use 2026
        </div>
      </motion.div>

      {/* Decorative walking sprite on title */}
      {mode === "title" && <TitleSprite />}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10 }}>

        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.15 }}
          className="text-center"
        >
          <p
            className="font-bold tracking-[0.25em] uppercase text-sm mb-1"
            style={{ color: "rgba(255,255,255,0.88)", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
          >
            Welcome to
          </p>
          <h1
            style={{
              fontFamily: "var(--font-fredoka, 'Fredoka One', cursive)",
              fontSize: "clamp(4.5rem, 14vw, 9.5rem)",
              lineHeight: 1,
              color: "#FFD04A",
              textShadow: "0 5px 0 #a06800, 0 10px 0 #7a4e00, 0 16px 32px rgba(0,0,0,0.7)",
              letterSpacing: "-0.01em",
            }}
          >
            Forage
          </h1>
          <p
            className="font-semibold mt-3 text-sm"
            style={{ color: "rgba(255,255,255,0.78)", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
          >
            AI finds real vendors. You build your product.
          </p>
        </motion.div>

        {/* Press any key / Login card */}
        <div className="mt-10 w-full flex justify-center">
          <AnimatePresence mode="wait">
            {mode === "title" && (
              <motion.div
                key="presskey"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 0.5 }}
              >
                {/* Blinking press-any-key */}
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-base"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    backdropFilter: "blur(10px)",
                    border: "1.5px solid rgba(255,255,255,0.36)",
                    color: "white",
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  ✨ Press any key to start
                </motion.div>
              </motion.div>
            )}

            {mode === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 32, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="w-full max-w-sm mx-4 rounded-3xl p-5 shadow-2xl"
                style={{
                  background: "var(--cream)",
                  border: "3.5px solid var(--primary)",
                  boxShadow: "0 16px 56px rgba(0,0,0,0.55)",
                }}
                onClick={e => e.stopPropagation()}
              >
                <p className="text-sm font-extrabold text-center mb-4" style={{ color: "var(--primary-dark)" }}>
                  How would you like to start?
                </p>

                {/* Google */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { playClick(); signIn("google"); }}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-sm font-extrabold mb-3"
                  style={{
                    background: "white",
                    color: "#1f1f1f",
                    border: "2.5px solid #e0e0e0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                    <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
                    <path fill="#FBBC05" d="M24 46c5.9 0 10.9-2 14.5-5.4l-6.7-5.5C29.8 36.9 27 38 24 38c-6 0-11.1-4-12.9-9.5l-7 5.4C7.9 41.5 15.4 46 24 46z"/>
                    <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.4-2.5 4.5-4.7 5.9l6.7 5.5C42 36.6 45 31 45 24c0-1.3-.2-2.7-.5-4z"/>
                  </svg>
                  Continue with Google
                </motion.button>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px" style={{ background: "var(--border-game)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>or</span>
                  <div className="flex-1 h-px" style={{ background: "var(--border-game)" }} />
                </div>

                {/* Demo */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDemo}
                  disabled={demoLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-extrabold disabled:opacity-60"
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    border: "2.5px solid var(--primary-dark)",
                    boxShadow: "0 4px 16px rgba(91,173,78,0.4)",
                  }}
                >
                  {demoLoading ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>🌿</motion.span>
                      Loading your village...
                    </>
                  ) : (
                    <>🎮 Try Live Demo</>
                  )}
                </motion.button>

                <p className="text-center text-xs font-semibold mt-3" style={{ color: "var(--muted)" }}>
                  No account needed · Instant village · Real AI agents
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* About button — bottom left */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        onClick={e => { e.stopPropagation(); setShowAbout(true); }}
        className="absolute bottom-5 left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
        style={{
          zIndex: 10,
          background: "rgba(255,255,255,0.16)",
          backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(255,255,255,0.3)",
          color: "rgba(255,255,255,0.9)",
          cursor: "pointer",
        }}
      >
        ℹ️ About Forage
      </motion.button>

      {/* About modal */}
      <AnimatePresence>
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </div>
  );
}
