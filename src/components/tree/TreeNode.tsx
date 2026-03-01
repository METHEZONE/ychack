"use client";

import { useRouter } from "next/navigation";
import { ANIMAL_EMOJI, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, VendorStage } from "@/lib/constants";

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
        className="px-5 py-3 rounded-2xl font-semibold text-center text-sm"
        style={{ background: "var(--primary)", color: "white", minWidth: 180 }}
      >
        🗺️ {node.label}
      </div>
    );
  }

  const emoji = node.vendor
    ? ANIMAL_EMOJI[node.vendor.animalType as AnimalType] ?? "🐾"
    : "🏢";
  const stageColor = STAGE_COLORS[node.stage as VendorStage] ?? "#888";

  return (
    <div
      onClick={() => node.vendorId && router.push(`/vendor/${node.vendorId}`)}
      className="relative flex flex-col items-center gap-1 cursor-pointer group"
      style={{ opacity: node.isDead ? 0.45 : 1 }}
    >
      {/* Recommended glow */}
      {node.isRecommended && (
        <div
          className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
          style={{ background: "#fbbf2430", boxShadow: "0 0 12px #fbbf24" }}
        />
      )}

      <div
        className="px-4 py-3 rounded-2xl text-sm font-medium transition-all group-hover:scale-105 relative"
        style={{
          background: node.isDead ? "#f1f5f9" : "var(--surface)",
          border: node.isRecommended
            ? "2px solid #fbbf24"
            : `1.5px solid ${node.isDead ? "#e2e8f0" : "var(--border)"}`,
          minWidth: 140,
          textAlign: "center",
          color: node.isDead ? "#94a3b8" : "var(--foreground)",
        }}
      >
        {node.isRecommended && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: "#fbbf24", color: "white" }}>
            ⭐ Best
          </div>
        )}
        <div className="text-2xl mb-1">{emoji}</div>
        <div className="font-semibold">{node.label}</div>
        <div
          className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
          style={{ background: stageColor + "20", color: stageColor }}
        >
          {node.isDead ? `✖ ${node.deadReason ?? "No reply"}` : node.stage}
        </div>
        {node.reason && !node.isDead && (
          <div
            className="text-xs mt-1.5 opacity-70"
            style={{ color: "var(--muted)" }}
          >
            {node.reason}
          </div>
        )}
      </div>
    </div>
  );
}
