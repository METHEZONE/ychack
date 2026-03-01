"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { LS_USER_ID } from "@/lib/constants";
import { useForageStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const setUserId = useForageStore((s) => s.setUserId);

  useEffect(() => {
    const savedId = localStorage.getItem(LS_USER_ID);
    if (savedId) {
      // Returning user — restore session and go to village
      setUserId(savedId as Parameters<typeof setUserId>[0]);
      router.replace("/village");
    }
  }, [router, setUserId]);

  return (
    <main className="w-full h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <OnboardingFlow />
    </main>
  );
}
