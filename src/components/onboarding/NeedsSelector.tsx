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
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Select what you need help sourcing:
      </p>
      <div className="space-y-2">
        {needs.map((need, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
            style={{
              background: selected.has(i) ? "var(--primary)" + "15" : "var(--surface)",
              border: selected.has(i)
                ? "1.5px solid var(--primary)"
                : "1.5px solid var(--border)",
            }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{
                background: selected.has(i) ? "var(--primary)" : "var(--border)",
                color: "white",
              }}
            >
              {selected.has(i) ? "✓" : ""}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {need.category}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {need.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => onConfirm(selectedNeeds)}
        disabled={selectedNeeds.length === 0}
        className="w-full py-3 rounded-xl font-semibold text-sm mt-2 disabled:opacity-40 transition-colors"
        style={{ background: "var(--primary)", color: "white" }}
      >
        Start Foraging ({selectedNeeds.length} quests)
      </button>
    </div>
  );
}
