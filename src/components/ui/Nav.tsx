"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useForageStore } from "@/lib/store";
import { setSoundEnabled, soundEnabled } from "@/lib/sounds";

export function Nav() {
  const pathname = usePathname();
  const toggleSidebar = useForageStore((s) => s.toggleSidebar);
  const agentBusy = useForageStore((s) => s.agentBusy);
  const agentStatus = useForageStore((s) => s.agentStatus);
  const [muted, setMuted] = useState(!soundEnabled);

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setSoundEnabled(!next);
  }

  const navItems = [
    { href: "/village", label: "🏘️ Village" },
    { href: "/tree", label: "🗺️ Quests" },
  ];

  return (
    <nav
      className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(8px)",
        borderBottom: "2.5px solid var(--border-game)",
        height: 48,
      }}
    >
      {/* Logo — Fredoka One */}
      <Link
        href="/"
        className="font-display font-bold text-lg flex items-center gap-1.5 mr-3"
        style={{ color: "var(--primary-dark)", fontFamily: "var(--font-fredoka, 'Fredoka One', cursive)" }}
      >
        🌿 Forage
      </Link>

      {/* Nav pills */}
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-extrabold px-3 py-1.5 rounded-full transition-all"
            style={{
              color: active ? "white" : "var(--primary-dark)",
              background: active ? "var(--primary)" : "rgba(255,255,255,0.7)",
              border: active ? "2px solid var(--primary-dark)" : "2px solid var(--border-game)",
              boxShadow: active ? "0 2px 8px rgba(91,173,78,0.3)" : undefined,
            }}
          >
            {item.label}
          </Link>
        );
      })}

      {/* Agent busy badge */}
      {agentBusy && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: "var(--primary)" + "20", color: "var(--primary-dark)", border: "1.5px solid var(--primary)" }}
        >
          <span
            className="w-2 h-2 rounded-full glow-pulse"
            style={{ background: "var(--primary)" }}
          />
          {agentStatus || "Foraging..."}
        </motion.div>
      )}

      {/* Right-side controls */}
      <div className="ml-auto flex items-center gap-2">
        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all hover:scale-110"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "2px solid var(--border-game)",
          }}
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? "🔇" : "🔊"}
        </button>

        {/* Sidebar toggle (village page only) */}
        {pathname === "/village" && (
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all hover:scale-110"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "2px solid var(--border-game)",
            }}
            title="Toggle villagers"
          >
            ☰
          </button>
        )}
      </div>
    </nav>
  );
}
