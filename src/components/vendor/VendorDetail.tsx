"use client";

import { useQuery, useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DealProgress } from "./DealProgress";
import { EmailThread } from "./EmailThread";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { VendorStage } from "@/lib/constants";

interface VendorDetailProps {
  vendorId: string;
}

export function VendorDetail({ vendorId }: VendorDetailProps) {
  const router = useRouter();
  const vendor = useQuery(api.vendors.get, {
    vendorId: vendorId as Id<"vendors">,
  });

  const draftNegotiation = useAction(api.actions.claude.draftNegotiationEmail);
  const updateStage = useMutation(api.vendors.updateStage);

  const [negotiationDraft, setNegotiationDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  if (vendor === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-4xl">🌿</div>
      </div>
    );
  }

  if (vendor === null) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--muted)" }}>
        Vendor not found.
      </div>
    );
  }

  const emoji = ANIMAL_EMOJI[vendor.animalType as AnimalType] ?? "🐾";
  const color = ANIMAL_COLORS[vendor.animalType as AnimalType] ?? "#888";
  const stage = vendor.stage as VendorStage;

  async function handleAutoNegotiate() {
    if (!vendor) return;
    setDrafting(true);
    try {
      const draft = await draftNegotiation({
        vendorName: vendor.companyName,
        vendorEmail: vendor.contactEmail ?? "",
        currentQuote: vendor.quote ?? {},
        userCompanyName: "Your Company",
        userNeed: "sourcing inquiry",
      });
      setNegotiationDraft(draft);
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm mb-4 flex items-center gap-1 hover:opacity-70 transition-opacity"
        style={{ color: "var(--muted)" }}
      >
        ← Back to village
      </button>

      {/* Header */}
      <div
        className="rounded-2xl p-6 mb-6 flex items-start gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: color + "20" }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            {vendor.characterName}
          </h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
            {vendor.companyName}
          </p>
          {vendor.location && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--muted)" }}>
              📍 {vendor.location}
            </p>
          )}
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-1 flex items-center gap-1 hover:underline"
              style={{ color: "var(--primary)" }}
            >
              🌐 {vendor.website}
            </a>
          )}
        </div>
      </div>

      {/* Stage progress */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--muted)" }}>
          DEAL PROGRESS
        </h2>
        <DealProgress stage={stage} />
      </div>

      {/* Quote */}
      {vendor.quote && (vendor.quote.price || vendor.quote.moq || vendor.quote.leadTime) && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>
            QUOTE
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {vendor.quote.price && (
              <div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Price</div>
                <div className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  {vendor.quote.price}
                </div>
              </div>
            )}
            {vendor.quote.moq && (
              <div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>MOQ</div>
                <div className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  {vendor.quote.moq}
                </div>
              </div>
            )}
            {vendor.quote.leadTime && (
              <div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Lead Time</div>
                <div className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  {vendor.quote.leadTime}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent notes */}
      {vendor.agentNotes && (
        <div
          className="rounded-2xl p-5 mb-6 flex gap-3"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          <span className="text-xl">🌿</span>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: "#166534" }}>
              Forage&apos;s Assessment
            </div>
            <p className="text-sm" style={{ color: "#166534" }}>
              {vendor.agentNotes}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleAutoNegotiate}
          disabled={drafting}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {drafting ? "Drafting..." : "⚡ Auto-negotiate"}
        </button>
        <button
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "var(--surface)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          ✏️ Draft reply
        </button>
      </div>

      {/* Negotiation draft */}
      {negotiationDraft && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              NEGOTIATION DRAFT
            </h2>
            <button
              onClick={() => setNegotiationDraft(null)}
              className="text-xs"
              style={{ color: "var(--muted)" }}
            >
              Discard
            </button>
          </div>
          <div
            className="text-sm whitespace-pre-wrap leading-relaxed mb-4"
            style={{ color: "var(--foreground)" }}
          >
            {negotiationDraft}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--primary)", color: "white" }}
            >
              ⚡ Send now
            </button>
            <button
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              ✏️ Edit first
            </button>
          </div>
        </div>
      )}

      {/* Email thread */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--muted)" }}>
          MESSAGES
        </h2>
        <EmailThread vendorId={vendorId as Id<"vendors">} />
      </div>
    </div>
  );
}
