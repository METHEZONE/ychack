"use client";

import { useState } from "react";

interface Need {
  category: string;
  description: string;
  searchQuery: string;
}

interface NeedsSelectorProps {
  needs: Need[];
  onConfirm: (selectedNeeds: Need[]) => void;
}

export function NeedsSelector({ needs, onConfirm }: NeedsSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(needs.map((_, i) => i)) // all selected by default
  );

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const selectedNeeds = needs.filter((_, i) => selected.has(i));

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>What do you need? 🎯</h2>
      <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
        Select what you need help sourcing:
      </p>
      <div className="space-y-2">
        {needs.map((need, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
            style={{
              background: selected.has(i) ? "rgba(91,173,78,0.12)" : "var(--panel)",
              border: selected.has(i) ? "2.5px solid var(--primary)" : "2.5px solid var(--border-game)",
            }}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-extrabold"
              style={{ background: selected.has(i) ? "var(--primary)" : "var(--border-game)", color: "white" }}
            >
              {selected.has(i) ? "✓" : ""}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold" style={{ color: "var(--text)" }}>{need.category}</div>
              <div className="text-xs mt-0.5 font-semibold" style={{ color: "var(--muted)" }}>{need.description}</div>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => onConfirm(selectedNeeds)}
        disabled={selectedNeeds.length === 0}
        className="w-full py-3 rounded-2xl font-extrabold text-sm mt-2 disabled:opacity-40 transition-colors"
        style={{ background: "var(--primary)", color: "white", border: "2.5px solid var(--primary-dark)" }}
      >
        Start Foraging ({selectedNeeds.length} quest{selectedNeeds.length !== 1 ? "s" : ""}) 🌿
      </button>
    </div>
  );
}
