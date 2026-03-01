export const dynamic = "force-dynamic";

import { DecisionTree } from "@/components/tree/DecisionTree";
import { Nav } from "@/components/ui/Nav";

export default function TreePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)]">
      <Nav />
      <div className="flex-1 overflow-hidden">
        <DecisionTree />
      </div>
    </div>
  );
}
