"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ANIMAL_EMOJI, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { playClick } from "@/lib/sounds";

interface TreeNodeData {
  _id: string;
  label: string;
  stage: string;
  isRecommended: boolean;
  isDead: boolean;
  deadReason?: string;
  reason?: string;
  vendorId?: string;
  vendor?: {
    _id: string;
    companyName: string;
    animalType: string;
    stage: string;
  };
}

interface TreeNodeProps {
  node: TreeNodeData;
  isRoot?: boolean;
}

export function TreeNode({ node, isRoot }: TreeNodeProps) {
  const router = useRouter();

  if (isRoot) {
    return (
      <div
        className="px-6 py-3 rounded-2xl font-extrabold text-center text-sm shadow-md"
        style={{
          background: "var(--primary)",
          color: "white",
          border: "2.5px solid var(--primary-dark)",
          minWidth: 200,
        }}
      >
        🗺️ {node.label}
      </div>
    );
  }

  const emoji = node.vendor
    ? ANIMAL_EMOJI[node.vendor.animalType as AnimalType] ?? "🐾"
    : "🏢";
  const stageColor = STAGE_COLORS[node.stage as VendorStage] ?? "#888";
  const stageLabel = STAGE_LABELS[node.stage as VendorStage] ?? node.stage;

  return (
    <motion.div
      onClick={() => {
        if (node.vendorId) {
          playClick();
          router.push(`/vendor/${node.vendorId}`);
        }
      }}
      whileHover={node.vendorId ? { scale: 1.06, y: -3 } : undefined}
      whileTap={node.vendorId ? { scale: 0.97 } : undefined}
      className="relative flex flex-col items-center gap-1 cursor-pointer"
      style={{ opacity: node.isDead ? 0.45 : 1 }}
    >
      {/* Recommended glow ring */}
      {node.isRecommended && (
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow: "0 0 16px 4px #ffd04a88",
            animation: "glowPulse 1.5s ease-in-out infinite",
          }}
        />
      )}

      <div
        className="px-4 py-3.5 rounded-3xl text-sm font-bold transition-all relative shadow-sm"
        style={{
          background: node.isDead ? "#f1f5f9" : "var(--cream)",
          border: node.isRecommended
            ? "3px solid var(--accent)"
            : `2.5px solid ${node.isDead ? "#e2e8f0" : "var(--border-game)"}`,
          minWidth: 148,
          textAlign: "center",
          color: node.isDead ? "#94a3b8" : "var(--text)",
        }}
      >
        {/* Best badge */}
        {node.isRecommended && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-2.5 py-0.5 rounded-full font-extrabold whitespace-nowrap"
            style={{ background: "var(--accent)", color: "var(--text)", border: "2px solid var(--accent-hover)" }}
          >
            ⭐ Best
          </div>
        )}

        <div className="text-2xl mb-1.5">{emoji}</div>
        <div className="font-extrabold text-xs">{node.label}</div>
        <div
          className="text-xs mt-1.5 px-2 py-0.5 rounded-full inline-block font-bold"
          style={{ background: stageColor + "22", color: stageColor, border: `1.5px solid ${stageColor}44` }}
        >
          {node.isDead ? `✖ ${node.deadReason ?? "No reply"}` : stageLabel}
        </div>
        {node.reason && !node.isDead && (
          <div className="text-xs mt-1.5 leading-relaxed font-semibold" style={{ color: "var(--muted)" }}>
            {node.reason.slice(0, 60)}{node.reason.length > 60 ? "..." : ""}
          </div>
        )}
      </div>
    </motion.div>
  );
}
