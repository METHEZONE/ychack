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

type Step = "choose" | "existing" | "scraping" | "confirm" | "new";

export function CompanySetup({ onComplete }: CompanySetupProps) {
  const [step, setStep] = useState<Step>("choose");
  const [website, setWebsite] = useState("");
  const [productIdea, setProductIdea] = useState("");
  const [error, setError] = useState("");

  // Editable confirmed fields
  const [confirmedName, setConfirmedName] = useState("");
  const [confirmedDesc, setConfirmedDesc] = useState("");

  const scrapeWebsite = useAction(api.actions.claude.scrapeAndAnalyzeWebsite);

  async function handleScrape() {
    if (!website.trim()) return;
    setError("");
    setStep("scraping");
    // Normalize URL — add https:// if missing
    const normalizedUrl = website.trim().match(/^https?:\/\//)
      ? website.trim()
      : `https://${website.trim()}`;
    try {
      const result = await scrapeWebsite({ url: normalizedUrl });
      setConfirmedName(result?.companyName ?? "");
      setConfirmedDesc(result?.description ?? result?.products ?? "");
      setStep("confirm");
    } catch {
      setError("Couldn't load that website. Enter details manually.");
      setConfirmedName("");
      setConfirmedDesc("");
      setStep("confirm");
    }
  }

  function handleConfirm() {
    const normalizedUrl = website.trim().match(/^https?:\/\//)
      ? website.trim()
      : `https://${website.trim()}`;
    onComplete({
      companyName: confirmedName || undefined,
      companyDescription: confirmedDesc || undefined,
      website: normalizedUrl,
      isNewBusiness: false,
    });
  }

  function handleNewBusiness() {
    if (!productIdea.trim()) return;
    onComplete({ productIdea, isNewBusiness: true });
  }

  // ── Choose ─────────────────────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>
          Tell us about your business
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep("existing")}
            className="p-4 rounded-2xl text-left transition-all hover:scale-105"
            style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)" }}
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-extrabold text-sm" style={{ color: "var(--text)" }}>Existing business</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: "var(--muted)" }}>I have a website</div>
          </button>
          <button
            onClick={() => setStep("new")}
            className="p-4 rounded-2xl text-left transition-all hover:scale-105"
            style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)" }}
          >
            <div className="text-2xl mb-2">🌱</div>
            <div className="font-extrabold text-sm" style={{ color: "var(--text)" }}>New idea</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: "var(--muted)" }}>I have a product idea</div>
          </button>
        </div>
      </div>
    );
  }

  // ── Enter URL ──────────────────────────────────────────────────────────────
  if (step === "existing") {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep("choose")} className="text-xs flex items-center gap-1 font-bold" style={{ color: "var(--muted)" }}>
          ← Back
        </button>
        <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>What&apos;s your website?</h2>
        <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
          Forage reads your site to understand your business automatically.
        </p>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          placeholder="https://yourcompany.com"
          className="w-full px-4 py-3 text-sm outline-none font-semibold"
          style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)", borderRadius: 14, color: "var(--text)" }}
        />
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        <button
          onClick={handleScrape}
          disabled={!website.trim()}
          className="w-full py-3 rounded-2xl font-extrabold text-sm disabled:opacity-40 transition-colors"
          style={{ background: "var(--primary)", color: "white", border: "2.5px solid var(--primary-dark)" }}
        >
          Let Forage learn about you →
        </button>
      </div>
    );
  }

  // ── Scraping (loading) ─────────────────────────────────────────────────────
  if (step === "scraping") {
    return (
      <div className="space-y-5 py-2">
        <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>Reading your website...</h2>
        <div className="space-y-3">
          {[
            { icon: "🌐", label: "Fetching page content", done: false },
            { icon: "🤖", label: "Analyzing with AI", done: false },
            { icon: "✨", label: "Extracting company info", done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "var(--panel)", border: "2px solid var(--border-game)" }}>
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{item.label}</span>
              <span
                className="text-xs font-bold animate-pulse"
                style={{ color: "var(--primary)" }}
              >
                ···
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Takes about 3 seconds 🌿
        </p>
      </div>
    );
  }

  // ── Confirm extracted data ─────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>Looks right?</h2>
        </div>
        <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Forage read your site. Edit anything that&apos;s off.
        </p>

        {error && (
          <div className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-700" style={{ background: "#FFF3CD", border: "1.5px solid #FFCF5C" }}>
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-extrabold mb-1 block" style={{ color: "var(--muted)" }}>COMPANY NAME</label>
            <input
              type="text"
              value={confirmedName}
              onChange={(e) => setConfirmedName(e.target.value)}
              placeholder="Your company name"
              className="w-full px-4 py-3 text-sm outline-none font-semibold"
              style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)", borderRadius: 14, color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-extrabold mb-1 block" style={{ color: "var(--muted)" }}>WHAT YOU DO</label>
            <textarea
              value={confirmedDesc}
              onChange={(e) => setConfirmedDesc(e.target.value)}
              placeholder="What does your company make or sell?"
              rows={3}
              className="w-full px-4 py-3 text-sm outline-none resize-none font-semibold"
              style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)", borderRadius: 14, color: "var(--text)" }}
            />
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded-2xl font-extrabold text-sm transition-colors"
          style={{ background: "var(--primary)", color: "white", border: "2.5px solid var(--primary-dark)" }}
        >
          Looks good →
        </button>
      </div>
    );
  }

  // ── New business ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <button onClick={() => setStep("choose")} className="text-xs flex items-center gap-1 font-bold" style={{ color: "var(--muted)" }}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>Tell us about your product idea</h2>
      <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
        Forage will break it down into the supply chain components you need.
      </p>
      <textarea
        value={productIdea}
        onChange={(e) => setProductIdea(e.target.value)}
        placeholder="e.g. I want to launch a kombucha brand targeting health-conscious millennials..."
        rows={4}
        className="w-full px-4 py-3 text-sm outline-none resize-none font-semibold"
        style={{ background: "var(--panel)", border: "2.5px solid var(--border-game)", borderRadius: 14, color: "var(--text)" }}
      />
      <button
        onClick={handleNewBusiness}
        disabled={!productIdea.trim()}
        className="w-full py-3 rounded-2xl font-extrabold text-sm disabled:opacity-40 transition-colors"
        style={{ background: "var(--primary)", color: "white", border: "2.5px solid var(--primary-dark)" }}
      >
        Break it down →
      </button>
    </div>
  );
}
