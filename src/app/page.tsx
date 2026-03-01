import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <OnboardingFlow />
    </main>
  );
}
