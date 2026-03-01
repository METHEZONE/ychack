"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { ANIMAL_EMOJI, ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { playClick, playChime, playNPCArrival } from "@/lib/sounds";
import { Doc } from "../../../convex/_generated/dataModel";

type VendorDoc = Doc<"vendors">;

interface HQInteriorProps {
  onClose: () => void;
  onApprove: (vendor: VendorDoc) => void;
}

export function HQInterior({ onClose, onApprove }: HQInteriorProps) {
  const userId = useForageStore((s) => s.userId);
  const isApproved = useForageStore((s) => s.isApproved);
  const approveVendor = useForageStore((s) => s.approveVendor);
  const markVendorSeen = useForageStore((s) => s.markVendorSeen);
  const isSeen = useForageStore((s) => s.isSeen);

  const [tab, setTab] = useState<"replies" | "waiting">("replies");
  const [passing, setPassing] = useState<Set<string>>(new Set());

  const vendors = useQuery(api.vendors.listByUser, userId ? { userId } : "skip");

  // Vendors not yet approved
  const unapproved = (vendors ?? []).filter((v: VendorDoc) => !isApproved(v._id));

  // Waiting = discovered/contacted (no reply yet)
  const waiting = unapproved.filter((v: VendorDoc) =>
    v.stage === "discovered" || v.stage === "contacted"
  );

  // New replies = replied/negotiating/closed but not yet approved
  const newReplies = unapproved.filter((v: VendorDoc) =>
    v.stage === "replied" || v.stage === "negotiating" || v.stage === "closed"
  );

  function handleApprove(vendor: VendorDoc) {
    playNPCArrival();
    approveVendor(vendor._id);
    markVendorSeen(vendor._id);
    onApprove(vendor);
  }

  function handlePass(id: string) {
    playClick();
    setPassing((s) => new Set(s).add(id));
  }

  function handleMarkSeen(id: string) {
    markVendorSeen(id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) { playClick(); onClose(); } }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--cream)",
          border: "4px solid var(--border-game)",
          maxHeight: "80vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "var(--primary)", color: "white" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏡</span>
            <div>
              <div className="font-extrabold text-sm">Forage HQ</div>
              <div className="text-xs opacity-80">Vendor waiting room</div>
            </div>
          </div>
          <button
            onClick={() => { playClick(); onClose(); }}
            className="text-2xl leading-none opacity-80 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2" style={{ borderColor: "var(--border-game)" }}>
          {[
            { key: "replies", label: "📬 New Replies", count: newReplies.length },
            { key: "waiting", label: "⏳ Waiting", count: waiting.length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { playClick(); setTab(t.key as "replies" | "waiting"); }}
              className="flex-1 py-3 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
              style={{
                background: tab === t.key ? "var(--panel)" : "transparent",
                color: tab === t.key ? "var(--primary-dark)" : "var(--muted)",
                borderBottom: tab === t.key ? "3px solid var(--primary)" : "3px solid transparent",
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full font-extrabold"
                  style={{
                    background: t.key === "replies" ? "#ef4444" : "var(--accent)",
                    color: t.key === "replies" ? "white" : "var(--text)",
                    fontSize: 9,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollable p-4 flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {tab === "replies" && (
              <motion.div
                key="replies"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-3"
              >
                {newReplies.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📭</div>
                    <div className="text-sm font-bold" style={{ color: "var(--muted)" }}>
                      No new replies yet
                    </div>
                    <div className="text-xs mt-1 font-semibold" style={{ color: "var(--muted)" }}>
                      Vendors will appear here when they reply
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-extrabold px-1" style={{ color: "var(--primary-dark)" }}>
                      These vendors replied — invite them to your village?
                    </div>
                    {newReplies.filter((v: VendorDoc) => !passing.has(v._id)).map((vendor: VendorDoc, i: number) => (
                      <VendorCard
                        key={vendor._id}
                        vendor={vendor}
                        index={i}
                        isNew={!isSeen(vendor._id)}
                        onApprove={() => handleApprove(vendor)}
                        onPass={() => handlePass(vendor._id)}
                        onSeen={() => handleMarkSeen(vendor._id)}
                        type="reply"
                      />
                    ))}
                  </>
                )}
              </motion.div>
            )}

            {tab === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-3"
              >
                {waiting.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">✨</div>
                    <div className="text-sm font-bold" style={{ color: "var(--muted)" }}>
                      Nobody waiting right now
                    </div>
                    <div className="text-xs mt-1 font-semibold" style={{ color: "var(--muted)" }}>
                      Use 🌿 Find Vendors to discover suppliers
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-extrabold px-1" style={{ color: "var(--muted)" }}>
                      Waiting for their reply...
                    </div>
                    {waiting.map((vendor: VendorDoc, i: number) => (
                      <VendorCard
                        key={vendor._id}
                        vendor={vendor}
                        index={i}
                        isNew={false}
                        onApprove={() => {}}
                        onPass={() => {}}
                        onSeen={() => {}}
                        type="waiting"
                      />
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Vendor Card ────────────────────────────────────────────────────────────

interface VendorCardProps {
  vendor: VendorDoc;
  index: number;
  isNew: boolean;
  type: "reply" | "waiting";
  onApprove: () => void;
  onPass: () => void;
  onSeen: () => void;
}

function VendorCard({ vendor, index, isNew, type, onApprove, onPass, onSeen }: VendorCardProps) {
  const emoji = ANIMAL_EMOJI[vendor.animalType as AnimalType] ?? "🐾";
  const color = ANIMAL_COLORS[vendor.animalType as AnimalType] ?? "#888";
  const stageColor = STAGE_COLORS[vendor.stage as VendorStage];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: isNew ? "#E8F5D0" : "var(--panel)",
        border: isNew ? "2.5px solid var(--primary)" : "2.5px solid var(--border-game)",
      }}
      onMouseEnter={isNew ? onSeen : undefined}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
        style={{ background: color + "28", border: `2.5px solid ${color}55` }}
      >
        {emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-extrabold" style={{ color: "var(--text)" }}>
            {vendor.characterName}
          </span>
          {isNew && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-extrabold"
              style={{ background: "#ef4444", color: "white" }}
            >
              NEW
            </span>
          )}
        </div>
        <div className="text-xs font-semibold truncate" style={{ color: "var(--muted)" }}>
          {vendor.companyName}
          {vendor.location ? ` · ${vendor.location}` : ""}
        </div>
        {vendor.quote?.price && (
          <div className="text-xs font-bold mt-0.5" style={{ color: "var(--primary-dark)" }}>
            💰 {vendor.quote.price}
            {vendor.quote.moq ? ` · MOQ: ${vendor.quote.moq}` : ""}
          </div>
        )}
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full font-bold mt-1"
          style={{ background: stageColor + "22", color: stageColor, border: `1.5px solid ${stageColor}44` }}
        >
          {STAGE_LABELS[vendor.stage as VendorStage]}
        </span>
      </div>

      {/* Actions */}
      {type === "reply" && (
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onApprove}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold"
            style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
          >
            ✅ Invite
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onPass}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold"
            style={{ background: "var(--panel)", color: "var(--muted)", border: "2px solid var(--border-game)" }}
          >
            Pass
          </motion.button>
        </div>
      )}

      {type === "waiting" && (
        <div className="flex-shrink-0 text-xl">⏳</div>
      )}
    </motion.div>
  );
}
