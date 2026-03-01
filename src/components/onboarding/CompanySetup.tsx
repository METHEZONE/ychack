"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface CompanyData {
  companyName?: string;
  companyDescription?: string;
  website?: string;
  isNewBusiness: boolean;
  productIdea?: string;
}

interface CompanySetupProps {
  onComplete: (data: CompanyData) => void;
}

export function CompanySetup({ onComplete }: CompanySetupProps) {
  const [step, setStep] = useState<"choose" | "existing" | "new">("choose");
  const [website, setWebsite] = useState("");
  const [productIdea, setProductIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrapeWebsite = useAction(api.actions.browserUse.scrapeWebsite);

  async function handleExistingBusiness() {
    if (!website.trim()) return;
    setLoading(true);
    setError("");
    try {
      const scraped = await scrapeWebsite({ url: website });
      onComplete({
        companyName: scraped?.companyName,
        companyDescription: scraped?.products,
        website,
        isNewBusiness: false,
      });
    } catch {
      setError("Couldn't scrape that website. Enter details manually?");
      // Fall through to manual entry
      onComplete({
        website,
        isNewBusiness: false,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleNewBusiness() {
    if (!productIdea.trim()) return;
    onComplete({
      productIdea,
      isNewBusiness: true,
    });
  }

  if (step === "choose") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          Tell me about your business
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep("existing")}
            className="p-4 rounded-2xl text-left transition-all hover:scale-105"
            style={{
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
            }}
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              Existing business
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              I have a website and company
            </div>
          </button>
          <button
            onClick={() => setStep("new")}
            className="p-4 rounded-2xl text-left transition-all hover:scale-105"
            style={{
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
            }}
          >
            <div className="text-2xl mb-2">🌱</div>
            <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              New idea
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              I have a product idea to build
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step === "existing") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep("choose")}
          className="text-xs flex items-center gap-1"
          style={{ color: "var(--muted)" }}
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          What&apos;s your website?
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Forage will scrape it to understand your business automatically.
        </p>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourcompany.com"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: "var(--background)",
            border: "1.5px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleExistingBusiness}
          disabled={loading || !website.trim()}
          className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors"
          style={{ background: "var(--primary)", color: "white" }}
        >
          {loading ? "Scraping website..." : "Let Forage learn about you →"}
        </button>
      </div>
    );
  }

  // New business
  return (
    <div className="space-y-4">
      <button
        onClick={() => setStep("choose")}
        className="text-xs flex items-center gap-1"
        style={{ color: "var(--muted)" }}
      >
        ← Back
      </button>
      <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
        Tell me about your product idea
      </h2>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Forage will break it down into the supply chain components you need.
      </p>
      <textarea
        value={productIdea}
        onChange={(e) => setProductIdea(e.target.value)}
        placeholder="e.g. I want to launch a kombucha brand targeting health-conscious millennials..."
        rows={4}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
        style={{
          background: "var(--background)",
          border: "1.5px solid var(--border)",
          color: "var(--foreground)",
        }}
      />
      <button
        onClick={handleNewBusiness}
        disabled={!productIdea.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors"
        style={{ background: "var(--primary)", color: "white" }}
      >
        Break it down →
      </button>
    </div>
  );
}
