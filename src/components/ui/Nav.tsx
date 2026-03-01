"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useForageStore } from "@/lib/store";

export function Nav() {
  const pathname = usePathname();
  const toggleSidebar = useForageStore((s) => s.toggleSidebar);
  const agentBusy = useForageStore((s) => s.agentBusy);
  const agentStatus = useForageStore((s) => s.agentStatus);

  const navItems = [
    { href: "/village", label: "🏘️ Village" },
    { href: "/tree", label: "🗺️ Quests" },
  ];

  return (
    <nav
      className="flex items-center gap-4 px-4 py-2 border-b flex-shrink-0"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        height: 44,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="font-bold text-sm flex items-center gap-1.5 mr-2"
        style={{ color: "var(--primary-dark)" }}
      >
        🌿 Forage
      </Link>

      {/* Nav links */}
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium transition-colors px-2 py-1 rounded-lg"
          style={{
            color:
              pathname === item.href
                ? "var(--primary-dark)"
                : "var(--muted)",
            background:
              pathname === item.href
                ? "var(--primary)" + "15"
                : "transparent",
          }}
        >
          {item.label}
        </Link>
      ))}

      {/* Agent status */}
      {agentBusy && (
        <div
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
          style={{ background: "var(--primary)" + "15", color: "var(--primary-dark)" }}
        >
          <span className="animate-spin text-xs">🌀</span>
          {agentStatus || "Foraging..."}
        </div>
      )}

      {/* Sidebar toggle (village page only) */}
      {pathname === "/village" && (
        <button
          onClick={toggleSidebar}
          className="ml-auto text-sm px-2 py-1 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
          style={{ color: "var(--muted)" }}
          title="Toggle sidebar"
        >
          ☰
        </button>
      )}
    </nav>
  );
}
