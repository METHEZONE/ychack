"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { setSoundEnabled, soundEnabled, playClick, playNotification } from "@/lib/sounds";
import { Doc } from "../../../convex/_generated/dataModel";

type VendorDoc = Doc<"vendors">;

interface GameHUDProps {
  onHQOpen: () => void;
}

export function GameHUD({ onHQOpen }: GameHUDProps) {
  const userId = useForageStore((s) => s.userId);
  const agentBusy = useForageStore((s) => s.agentBusy);
  const agentStatus = useForageStore((s) => s.agentStatus);
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWASD, setShowWASD] = useState(true);
  const [bellShaking, setBellShaking] = useState(false);
  const prevUnreadRef = useRef(0);

  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  useEffect(() => { setSoundOn(soundEnabled); }, []);
  useEffect(() => {
    const t = setTimeout(() => setShowWASD(false), 7000);
    return () => clearTimeout(t);
  }, []);

  const unreadVendors = (vendors ?? []).filter(
    (v: VendorDoc) => v.stage === "replied" && !v.userSeen
  );
  const unreadCount = unreadVendors.length;

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBellShaking(true);
      playNotification();
      setTimeout(() => setBellShaking(false), 800);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <>
      {/* ── Top-left: Logo + agent busy ── */}
      <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5 pointer-events-none">
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background: "var(--wood-header)",
            border: "3px solid var(--wood-outer)",
            boxShadow: "inset 0 0 0 1px var(--wood-light), 3px 3px 0 var(--pixel-shadow)",
          }}
        >
          <span style={{ fontSize: 18 }}>🌿</span>
          <span
            className="font-pixel"
            style={{ fontSize: 10, color: "#fff5e0", letterSpacing: "0.05em" }}
          >
            FORAGE
          </span>
        </div>

        <AnimatePresence>
          {agentBusy && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 px-3 py-1.5"
              style={{
                background: "var(--primary)",
                border: "3px solid var(--primary-dark)",
                boxShadow: "2px 2px 0 #1e4d1a",
                fontFamily: "var(--font-pixel), monospace",
                fontSize: 7,
                color: "white",
                letterSpacing: "0.04em",
              }}
            >
              <span className="w-2 h-2 rounded-full glow-pulse" style={{ background: "white" }} />
              {agentStatus || "WORKING..."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Top-right: Quest Tree + Bell + Settings ── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => { playClick(); router.push("/tree"); }}
          className="pixel-btn flex items-center gap-1.5 px-3 py-2"
        >
          <span style={{ fontSize: 13 }}>🌳</span>
          <span style={{ fontSize: 7 }}>QUEST TREE</span>
        </motion.button>

        {/* Bell */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          animate={bellShaking ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
          onClick={() => { playClick(); onHQOpen(); }}
          className="pixel-btn relative"
          style={{
            padding: "8px 10px",
            background: unreadCount > 0 ? "var(--accent)" : "var(--wood-mid)",
            borderColor: unreadCount > 0 ? "#a07800" : "var(--wood-outer)",
            boxShadow: unreadCount > 0 ? "0 4px 0 #6b5200" : "0 4px 0 var(--pixel-shadow)",
            color: unreadCount > 0 ? "var(--wood-outer)" : "#fff5e0",
          }}
        >
          <span style={{ fontSize: 14 }}>🔔</span>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center font-pixel"
                style={{ width: 16, height: 16, background: "#ef4444", border: "2px solid #7f1d1d", color: "white", fontSize: 7 }}
              >
                {unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Settings */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => { playClick(); setSettingsOpen((o) => !o); }}
          className="pixel-btn"
          style={{ padding: "8px 10px" }}
        >
          <span style={{ fontSize: 14 }}>⚙️</span>
        </motion.button>
      </div>

      {/* ── Settings dropdown ── */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-14 right-3 z-40 pixel-panel"
            style={{ minWidth: 186 }}
          >
            <div className="pixel-header">⚙️ SETTINGS</div>
            <div className="p-3 flex flex-col gap-2">
              <button
                className="pixel-btn flex items-center gap-2 w-full px-3 py-2 text-left"
                onClick={() => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); playClick(); }}
              >
                <span>{soundOn ? "🔊" : "🔇"}</span>
                <span style={{ fontSize: 7 }}>{soundOn ? "SOUND ON" : "SOUND OFF"}</span>
              </button>
              <button
                className="pixel-btn flex items-center gap-2 w-full px-3 py-2 text-left"
                onClick={() => { playClick(); setSettingsOpen(false); router.push("/tree"); }}
              >
                <span>🌳</span>
                <span style={{ fontSize: 7 }}>QUEST TREE</span>
              </button>
              <button
                className="pixel-btn flex items-center gap-2 w-full px-3 py-2 text-left"
                style={{ background: "#8b2020", borderColor: "#4a0f0f", boxShadow: "0 4px 0 #2d0808" }}
                onClick={() => {
                  playClick(); setSettingsOpen(false);
                  localStorage.clear();
                  fetch("/api/auth/local-session", { method: "DELETE" }).catch(() => {});
                  router.push("/");
                }}
              >
                <span>🚪</span>
                <span style={{ fontSize: 7 }}>EXIT VILLAGE</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WASD hint ── */}
      <AnimatePresence>
        {showWASD && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.95, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ delay: 1 }}
            className="absolute bottom-5 right-3 z-30 pixel-panel text-center"
            style={{ padding: "8px 14px" }}
          >
            <div className="font-pixel" style={{ fontSize: 7, color: "var(--wood-outer)" }}>WASD / ARROWS</div>
            <div className="font-pixel" style={{ fontSize: 6, color: "var(--wood-mid)", marginTop: 4 }}>E / SPACE = TALK</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
