"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DecisionTree } from "@/components/tree/DecisionTree";
import { Nav } from "@/components/ui/Nav";
import { useForageStore } from "@/lib/store";
import { LS_USER_ID } from "@/lib/constants";

export default function TreePage() {
  const router = useRouter();
  const userId = useForageStore((s) => s.userId);
  const setUserId = useForageStore((s) => s.setUserId);

  useEffect(() => {
    const savedId = localStorage.getItem(LS_USER_ID);
    if (savedId && !userId) {
      setUserId(savedId as Parameters<typeof setUserId>[0]);
      return;
    }
    if (!savedId && !userId) {
      fetch("/api/auth/local-session")
        .then((r) => r.json())
        .then((data) => {
          if (data.userId) {
            localStorage.setItem(LS_USER_ID, data.userId);
            setUserId(data.userId as Parameters<typeof setUserId>[0]);
          } else {
            router.replace("/");
          }
        })
        .catch(() => router.replace("/"));
    }
  }, [router, userId, setUserId]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--panel)" }}>
      <Nav />
      <div className="flex-1 overflow-hidden">
        <DecisionTree />
      </div>
    </div>
  );
}
