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
  onForageOpen: () => void;
  onHQOpen: () => void;
}

export function GameHUD({ onForageOpen, onHQOpen }: GameHUDProps) {
  const userId = useForageStore((s) => s.userId);
  const agentBusy = useForageStore((s) => s.agentBusy);
  const agentStatus = useForageStore((s) => s.agentStatus);
  const isSeen = useForageStore((s) => s.isSeen);
  const markVendorSeen = useForageStore((s) => s.markVendorSeen);
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);
  const [showWASD, setShowWASD] = useState(true);
  const [bellShaking, setBellShaking] = useState(false);
  const prevUnreadRef = useRef(0);

  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");
  const quests = useQuery(api.quests.listByUser, userId ? { userId } : "skip");

  useEffect(() => { setSoundOn(soundEnabled); }, []);
  useEffect(() => {
    const t = setTimeout(() => setShowWASD(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Unread = vendors that replied but haven't been seen yet
  const unreadVendors = (vendors ?? []).filter(
    (v: VendorDoc) => v.stage === "replied" && !isSeen(v._id)
  );
  const unreadCount = unreadVendors.length;

  // Shake bell + play sound when new unread arrives
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBellShaking(true);
      playNotification();
      setTimeout(() => setBellShaking(false), 800);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const activeQuest = quests?.find((q) => q.status === "active") ?? quests?.[0];

  return (
    <>
      {/* Top-left: Logo + Quest */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-bold"
            style={{
              color: "var(--primary-dark)",
              textShadow: "0 2px 6px rgba(255,255,255,0.9)",
              fontFamily: "var(--font-fredoka), 'Fredoka One', cursive",
            }}
          >
            🌿 Forage
          </span>
          <AnimatePresence>
            {agentBusy && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "var(--primary)",
                  color: "white",
                  border: "2px solid var(--primary-dark)",
                  boxShadow: "0 2px 8px rgba(91,173,78,0.5)",
                }}
              >
                <span className="w-2 h-2 rounded-full glow-pulse" style={{ background: "white" }} />
                {agentStatus || "Working..."}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {activeQuest && (
          <div
            className="text-xs font-bold px-2.5 py-1 rounded-xl pointer-events-none"
            style={{
              background: "rgba(255,255,255,0.88)",
              color: "var(--primary-dark)",
              backdropFilter: "blur(6px)",
              border: "2px solid var(--border-game)",
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            📋 {activeQuest.description}
          </div>
        )}
      </div>

      {/* Top-right: nav + bell + sound */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            playClick();
            localStorage.clear();
            router.push("/");
          }}
          className="px-3 py-2 rounded-2xl text-xs font-extrabold"
          style={{
            background: "rgba(255,255,255,0.88)",
            color: "var(--muted)",
            border: "2.5px solid var(--border-game)",
            backdropFilter: "blur(6px)",
          }}
        >
          ← Home
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => { playClick(); router.push("/tree"); }}
          className="px-3 py-2 rounded-2xl text-xs font-extrabold"
          style={{
            background: "rgba(255,255,255,0.88)",
            color: "var(--primary-dark)",
            border: "2.5px solid var(--border-game)",
            backdropFilter: "blur(6px)",
          }}
        >
          🌳 Quest Tree
        </motion.button>

        {/* Notification bell */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          animate={bellShaking ? { rotate: [0, -15, 15, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.6 }}
          onClick={() => { playClick(); onHQOpen(); }}
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{
            background: unreadCount > 0 ? "var(--accent)" : "rgba(255,255,255,0.88)",
            border: unreadCount > 0 ? "2.5px solid var(--accent-hover)" : "2.5px solid var(--border-game)",
            backdropFilter: "blur(6px)",
          }}
        >
          🔔
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-extrabold"
                style={{ background: "#ef4444", color: "white", fontSize: 9 }}
              >
                {unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSoundEnabled(next);
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{
            background: "rgba(255,255,255,0.88)",
            border: "2.5px solid var(--border-game)",
            backdropFilter: "blur(6px)",
          }}
        >
          {soundOn ? "🔊" : "🔇"}
        </motion.button>
      </div>

      {/* Bottom-right: vendor count */}
      {vendors && vendors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-extrabold"
          style={{
            background: "rgba(255,255,255,0.88)",
            color: "var(--primary-dark)",
            border: "2.5px solid var(--border-game)",
            backdropFilter: "blur(6px)",
          }}
        >
          🏘️ {vendors.length} villager{vendors.length !== 1 ? "s" : ""}
        </motion.div>
      )}

      {/* Bottom-left: Find Vendors + HQ buttons */}
      <div className="absolute bottom-6 left-4 z-30 flex gap-2">
        <motion.button
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => { playClick(); onForageOpen(); }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold shadow-xl"
          style={{
            background: "var(--primary)",
            color: "white",
            border: "3px solid var(--primary-dark)",
            boxShadow: "0 4px 20px rgba(91,173,78,0.45)",
          }}
        >
          <span className="text-xl">🌿</span>
          Find Vendors
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => { playClick(); onHQOpen(); }}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-extrabold shadow-xl relative"
          style={{
            background: "rgba(255,255,255,0.92)",
            color: "var(--primary-dark)",
            border: "3px solid var(--border-game)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          🏡 HQ
          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center font-extrabold"
              style={{ background: "#ef4444", color: "white", fontSize: 9 }}
            >
              {unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* WASD hint */}
      <AnimatePresence>
        {showWASD && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.92, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-20 right-4 z-30 text-center px-3 py-2 rounded-xl pointer-events-none"
            style={{
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(6px)",
              border: "2px solid var(--border-game)",
            }}
          >
            <div className="text-xs font-extrabold" style={{ color: "var(--primary-dark)" }}>WASD to move</div>
            <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>E / Space to talk</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
