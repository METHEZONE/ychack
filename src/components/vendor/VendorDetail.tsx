"use client";

import { useQuery, useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DealProgress } from "./DealProgress";
import { EmailThread } from "./EmailThread";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { playClick, playChime, playNegotiate } from "@/lib/sounds";

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="text-4xl"
        >
          🌿
        </motion.div>
      </div>
    );
  }

  if (vendor === null) {
    return (
      <div className="flex items-center justify-center h-full text-sm font-semibold" style={{ color: "var(--muted)" }}>
        Vendor not found.
      </div>
    );
  }

  const emoji = ANIMAL_EMOJI[vendor.animalType as AnimalType] ?? "🐾";
  const color = ANIMAL_COLORS[vendor.animalType as AnimalType] ?? "#888";
  const stage = vendor.stage as VendorStage;
  const stageColor = STAGE_COLORS[stage];

  async function handleAutoNegotiate() {
    if (!vendor) return;
    playNegotiate();
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
      playChime();
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 scrollable" style={{ overflowY: "auto", height: "100%" }}>
      {/* Back */}
      <button
        onClick={() => { playClick(); router.back(); }}
        className="text-sm mb-4 flex items-center gap-1.5 font-bold hover:opacity-70 transition-opacity"
        style={{ color: "var(--primary-dark)" }}
      >
        ← Back to village
      </button>

      {/* Header card */}
      <div
        className="rounded-3xl p-6 mb-5 flex items-start gap-4"
        style={{
          background: "var(--cream)",
          border: "3px solid var(--border-game)",
          boxShadow: "0 4px 16px rgba(91,173,78,0.12)",
        }}
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-sm"
          style={{ background: color + "25", border: `2.5px solid ${color}55` }}
        >
          {emoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>
              {vendor.characterName}
            </h1>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: stageColor + "22", color: stageColor, border: `1.5px solid ${stageColor}55` }}
            >
              {STAGE_LABELS[stage]}
            </span>
          </div>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--muted)" }}>
            {vendor.companyName}
          </p>
          {vendor.location && (
            <p className="text-xs mt-1 flex items-center gap-1 font-semibold" style={{ color: "var(--muted)" }}>
              📍 {vendor.location}
            </p>
          )}
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-1 flex items-center gap-1 hover:underline font-bold"
              style={{ color: "var(--primary)" }}
            >
              🌐 {vendor.website}
            </a>
          )}
        </div>
      </div>

      {/* Deal progress */}
      <div
        className="rounded-3xl p-5 mb-5"
        style={{ background: "var(--cream)", border: "3px solid var(--border-game)" }}
      >
        <h2 className="text-xs font-extrabold mb-4 tracking-wider" style={{ color: "var(--primary-dark)" }}>
          DEAL PROGRESS
        </h2>
        <DealProgress stage={stage} />
      </div>

      {/* Quote */}
      {vendor.quote && (vendor.quote.price || vendor.quote.moq || vendor.quote.leadTime) && (
        <div
          className="rounded-3xl p-5 mb-5"
          style={{ background: "var(--cream)", border: "3px solid var(--accent)" }}
        >
          <h2 className="text-xs font-extrabold mb-3 tracking-wider" style={{ color: "#b8860b" }}>
            💰 THEIR QUOTE
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {vendor.quote.price && (
              <div className="text-center">
                <div className="text-xs font-bold mb-1" style={{ color: "var(--muted)" }}>Price</div>
                <div className="text-base font-extrabold" style={{ color: "var(--text)" }}>
                  {vendor.quote.price}
                </div>
              </div>
            )}
            {vendor.quote.moq && (
              <div className="text-center">
                <div className="text-xs font-bold mb-1" style={{ color: "var(--muted)" }}>MOQ</div>
                <div className="text-base font-extrabold" style={{ color: "var(--text)" }}>
                  {vendor.quote.moq}
                </div>
              </div>
            )}
            {vendor.quote.leadTime && (
              <div className="text-center">
                <div className="text-xs font-bold mb-1" style={{ color: "var(--muted)" }}>Lead Time</div>
                <div className="text-base font-extrabold" style={{ color: "var(--text)" }}>
                  {vendor.quote.leadTime}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forage assessment */}
      {vendor.agentNotes && (
        <div
          className="rounded-3xl p-5 mb-5 flex gap-3"
          style={{ background: "#E8F5D0", border: "2.5px solid var(--border-game)" }}
        >
          <span className="text-2xl flex-shrink-0">🌿</span>
          <div>
            <div className="text-xs font-extrabold mb-1.5" style={{ color: "var(--primary-dark)" }}>
              Forage&apos;s Assessment
            </div>
            <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--primary-dark)" }}>
              {vendor.agentNotes}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mb-5">
        <motion.button
          onClick={handleAutoNegotiate}
          disabled={drafting}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex-1 py-3 rounded-2xl text-sm font-extrabold transition-colors disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--text)",
            border: "2.5px solid var(--accent-hover)",
          }}
        >
          {drafting ? "Drafting..." : "⚡ Auto-negotiate"}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex-1 py-3 rounded-2xl text-sm font-extrabold"
          style={{
            background: "var(--panel)",
            color: "var(--primary-dark)",
            border: "2.5px solid var(--border-game)",
          }}
        >
          ✏️ Draft reply
        </motion.button>
      </div>

      {/* Negotiation draft */}
      {negotiationDraft && (
        <div
          className="rounded-3xl p-5 mb-5"
          style={{ background: "var(--cream)", border: "3px solid var(--primary)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold tracking-wider" style={{ color: "var(--primary-dark)" }}>
              📝 NEGOTIATION DRAFT
            </h2>
            <button
              onClick={() => setNegotiationDraft(null)}
              className="text-xs font-bold hover:opacity-60"
              style={{ color: "var(--muted)" }}
            >
              Discard
            </button>
          </div>
          <div
            className="text-sm whitespace-pre-wrap leading-relaxed mb-4 font-semibold"
            style={{ color: "var(--text)" }}
          >
            {negotiationDraft}
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold"
              style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
            >
              ⚡ Send now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold"
              style={{ background: "var(--panel)", color: "var(--primary-dark)", border: "2px solid var(--border-game)" }}
            >
              ✏️ Edit first
            </motion.button>
          </div>
        </div>
      )}

      {/* Email thread */}
      <div
        className="rounded-3xl p-5 mb-6"
        style={{ background: "var(--cream)", border: "3px solid var(--border-game)" }}
      >
        <h2 className="text-xs font-extrabold mb-4 tracking-wider" style={{ color: "var(--primary-dark)" }}>
          ✉️ MESSAGES
        </h2>
        <EmailThread vendorId={vendorId as Id<"vendors">} />
      </div>
    </div>
  );
}
