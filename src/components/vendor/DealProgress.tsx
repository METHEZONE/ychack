"use client";

import { VENDOR_STAGES, STAGE_LABELS, STAGE_COLORS, VendorStage } from "@/lib/constants";

interface DealProgressProps {
  stage: VendorStage;
}

const ACTIVE_STAGES: VendorStage[] = [
  "discovered",
  "contacted",
  "replied",
  "negotiating",
  "closed",
];

export function DealProgress({ stage }: DealProgressProps) {
  if (stage === "dead") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
        style={{ background: "#fee2e2", color: "#dc2626" }}
      >
        <span>✖</span>
        <span className="font-medium">Deal dead — {STAGE_LABELS.dead}</span>
      </div>
    );
  }

  const currentIndex = ACTIVE_STAGES.indexOf(stage);

  return (
    <div className="flex items-center gap-1">
      {ACTIVE_STAGES.map((s, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const color = STAGE_COLORS[s];

        return (
          <div key={s} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                style={{
                  background: isCompleted || isCurrent ? color : "var(--surface)",
                  borderColor: isCompleted || isCurrent ? color : "var(--border)",
                  color: isCompleted || isCurrent ? "white" : "var(--muted)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                }}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{
                  color: isCurrent ? color : isCompleted ? "var(--foreground)" : "var(--muted)",
                }}
              >
                {STAGE_LABELS[s]}
              </span>
            </div>
            {i < ACTIVE_STAGES.length - 1 && (
              <div
                className="w-8 h-0.5 mb-5 flex-shrink-0"
                style={{
                  background: i < currentIndex ? STAGE_COLORS[ACTIVE_STAGES[i + 1]] : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
