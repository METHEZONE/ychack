"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useForageStore } from "@/lib/store";
import { TreeNode } from "./TreeNode";

type QuestDoc = Doc<"quests">;
type VendorDoc = Doc<"vendors">;
type WorkflowNodeDoc = Doc<"workflowNodes">;

export function DecisionTree() {
  const userId = useForageStore((s) => s.userId);
  const activeQuestId = useForageStore((s) => s.activeQuestId);

  const quests = useQuery(
    api.quests.listByUser,
    userId ? { userId } : "skip"
  );

  const nodes = useQuery(
    api.workflowNodes.listByQuest,
    activeQuestId ? { questId: activeQuestId } : "skip"
  );

  const vendors = useQuery(
    api.vendors.listByUser,
    userId ? { userId } : "skip"
  );

  if (!quests || quests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-3">🗺️</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            No quests yet
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Start by asking Forage to find vendors for you.
          </p>
        </div>
      </div>
    );
  }

  const activeQuest: QuestDoc = quests.find((q: QuestDoc) => q._id === activeQuestId) ?? quests[0];

  // Build tree: root node + vendor branches
  const vendorMap = new Map((vendors ?? []).map((v: VendorDoc) => [v._id, v]));
  const vendorNodes: WorkflowNodeDoc[] = (nodes ?? []).filter((n: WorkflowNodeDoc) => n.vendorId);

  return (
    <div className="h-full overflow-auto scrollable p-6">
      {/* Quest selector */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {quests.map((quest: QuestDoc) => (
          <button
            key={quest._id}
            onClick={() => useForageStore.getState().setActiveQuestId(quest._id)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={
              quest._id === (activeQuestId ?? quests[0]._id)
                ? { background: "var(--primary)", color: "white" }
                : {
                    background: "var(--surface)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            {quest.description}
          </button>
        ))}
      </div>

      {/* Tree visualization */}
      <div className="flex flex-col items-center gap-6">
        {/* Root quest node */}
        <TreeNode
          node={{
            _id: activeQuest._id,
            label: activeQuest.description,
            stage: activeQuest.status,
            isRecommended: false,
            isDead: false,
          }}
          isRoot
        />

        {/* Connector */}
        {vendorNodes.length > 0 && (
          <div className="w-0.5 h-8" style={{ background: "var(--border)" }} />
        )}

        {/* Vendor branches */}
        {vendorNodes.length > 0 && (
          <div className="flex items-start gap-6 flex-wrap justify-center">
            {vendorNodes.map((node: WorkflowNodeDoc) => {
              const vendor: VendorDoc | undefined = (node.vendorId ? vendorMap.get(node.vendorId) : undefined) as VendorDoc | undefined;
              return (
                <div key={node._id} className="flex flex-col items-center gap-2">
                  <TreeNode
                    node={{
                      ...node,
                      vendor: vendor
                        ? {
                            _id: vendor._id,
                            companyName: vendor.companyName,
                            animalType: vendor.animalType,
                            stage: vendor.stage,
                          }
                        : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state for quest with no nodes yet */}
        {vendorNodes.length === 0 && (
          <div
            className="text-center py-6 px-8 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Foraging in progress... vendors will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
