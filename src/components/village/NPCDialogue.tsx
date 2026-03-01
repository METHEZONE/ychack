"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { ANIMAL_COLORS, AnimalType } from "@/lib/animals";
import { SpriteHead } from "@/components/ui/SpriteHead";
import { STAGE_COLORS, STAGE_LABELS, VendorStage } from "@/lib/constants";
import { playDialogueBlip, playChime, playClick, playNegotiate } from "@/lib/sounds";

type VendorDoc = Doc<"vendors">;

interface NPCDialogueProps {
  vendor: VendorDoc;
  onClose: () => void;
}

function getDialogueText(vendor: VendorDoc): string {
  const { stage, characterName, companyName, quote } = vendor;
  switch (stage as VendorStage) {
    case "discovered":
      return `Hi there! I'm ${characterName} from ${companyName}! We're excited to connect with you. Want me to put together a sourcing quote?`;
    case "contacted":
      return `Hey! Got your inquiry at ${companyName}. We're reviewing your request now — should have something for you soon!`;
    case "replied":
      return `Great news from ${companyName}! Here's what we can offer: ${
        quote?.price ? `Price — ${quote.price}. ` : ""
      }${quote?.moq ? `MOQ — ${quote.moq}. ` : ""}${
        quote?.leadTime ? `Lead time — ${quote.leadTime}.` : ""
      } What do you think?`;
    case "negotiating":
      return `We received your negotiation email at ${companyName}! Looking it over now. ${characterName} really wants to make this work. Stand by!`;
    case "closed":
      return `Deal done! It was a pleasure partnering with you at ${companyName}. ${characterName} is thrilled to work together! ⭐`;
    case "dead":
      return `...${characterName} from ${companyName} hasn't responded yet. Sometimes vendors get busy. Want to try a different approach?`;
    default:
      return `${characterName} is glad to meet you!`;
  }
}

interface Choice {
  label: string;
  type: "navigate" | "negotiate" | "accept" | "close";
}

function getChoices(vendor: VendorDoc): Choice[] {
  switch (vendor.stage as VendorStage) {
    case "discovered":
    case "contacted":
      return [
        { label: "⚡ Auto-negotiate", type: "negotiate" },
        { label: "📋 View full profile →", type: "navigate" },
        { label: "Later...", type: "close" },
      ];
    case "replied":
      return [
        { label: "⚡ Auto-negotiate price", type: "negotiate" },
        { label: "✅ Accept this deal", type: "accept" },
        { label: "📋 View full profile →", type: "navigate" },
      ];
    case "negotiating":
      return [
        { label: "✅ Accept current offer", type: "accept" },
        { label: "📋 View messages →", type: "navigate" },
        { label: "Keep negotiating...", type: "close" },
      ];
    case "closed":
      return [
        { label: "🎉 View deal details →", type: "navigate" },
        { label: "Happy dance! 💃", type: "close" },
      ];
    case "dead":
      return [
        { label: "📋 View profile →", type: "navigate" },
        { label: "Goodbye...", type: "close" },
      ];
    default:
      return [{ label: "Goodbye", type: "close" }];
  }
}

type DialogueState = "talking" | "negotiating" | "draft" | "sending" | "success";

export function NPCDialogue({ vendor, onClose }: NPCDialogueProps) {
  const router = useRouter();
  const color = ANIMAL_COLORS[vendor.animalType as AnimalType] ?? "#888";
  const stageColor = STAGE_COLORS[vendor.stage as VendorStage];
  const fullText = getDialogueText(vendor);
  const choices = getChoices(vendor);

  const [displayText, setDisplayText] = useState("");
  const [textDone, setTextDone] = useState(false);
  const [dialogueState, setDialogueState] = useState<DialogueState>("talking");
  const [draftText, setDraftText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedDraft, setEditedDraft] = useState("");
  const typeIndexRef = useRef(0);

  const draftNegotiation = useAction(api.actions.claude.draftNegotiationEmail);
  const sendEmailAction = useAction(api.actions.agentmail.sendEmail);
  const createInbox = useAction(api.actions.agentmail.createVendorInbox);
  const updateStage = useMutation(api.vendors.updateStage);

  // Typewriter effect
  useEffect(() => {
    typeIndexRef.current = 0;
    setDisplayText("");
    setTextDone(false);
    const iv = setInterval(() => {
      const i = typeIndexRef.current;
      if (i >= fullText.length) {
        clearInterval(iv);
        setTextDone(true);
        return;
      }
      setDisplayText(fullText.slice(0, i + 1));
      if (i % 3 === 0) playDialogueBlip(vendor.animalType);
      typeIndexRef.current = i + 1;
    }, 32);
    return () => clearInterval(iv);
  }, [fullText, vendor.animalType]);

  // Skip typewriter on click
  function skipOrContinue() {
    if (!textDone) {
      typeIndexRef.current = fullText.length;
      setDisplayText(fullText);
      setTextDone(true);
    }
  }

  async function handleChoice(choice: Choice) {
    playClick();
    switch (choice.type) {
      case "close":
        onClose();
        break;
      case "navigate":
        onClose();
        router.push(`/vendor/${vendor._id}`);
        break;
      case "accept":
        await updateStage({ vendorId: vendor._id, stage: "closed", emailSent: false });
        playChime();
        setDialogueState("success");
        break;
      case "negotiate":
        setDialogueState("negotiating");
        playNegotiate();
        try {
          const draft = await draftNegotiation({
            vendorName: vendor.companyName,
            vendorEmail: vendor.contactEmail ?? "",
            currentQuote: vendor.quote ?? {},
            userCompanyName: "Your Company",
            userNeed: "sourcing inquiry",
          });
          setDraftText(draft);
          setEditedDraft(draft);
          setDialogueState("draft");
          playChime();
        } catch {
          setDialogueState("talking");
        }
        break;
    }
  }

  async function handleSendDraft() {
    if (!vendor.contactEmail) {
      alert("No contact email on file. View the full profile to add one.");
      return;
    }
    setDialogueState("sending");
    try {
      let inboxId = vendor.agentmailInboxId ?? null;
      if (!inboxId) {
        const inbox = await createInbox({
          vendorId: vendor._id,
          vendorName: vendor.companyName,
        }) as { inboxId: string };
        inboxId = inbox.inboxId;
      }
      const body = editMode ? editedDraft : draftText;
      await sendEmailAction({
        vendorId: vendor._id,
        inboxId,
        to: vendor.contactEmail,
        subject: `Following up — sourcing inquiry for ${vendor.companyName}`,
        body,
        isDraft: false,
      });
      await updateStage({ vendorId: vendor._id, stage: "negotiating", emailSent: true });
      playChime();
      setDialogueState("success");
    } catch {
      setDialogueState("draft");
    }
  }

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 34 }}
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        background: "var(--cream)",
        borderTop: "4px solid var(--border-game)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        minHeight: 180,
      }}
      onClick={skipOrContinue}
    >
      <div className="flex gap-4 px-5 pt-4 pb-5">
        {/* NPC avatar + name */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-20">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="rounded-2xl shadow-md flex items-center justify-center"
            style={{
              background: color + "28",
              border: `3px solid ${color}60`,
              overflow: "hidden",
              imageRendering: "pixelated",
              flexShrink: 0,
            }}
          >
            <SpriteHead animalType={vendor.animalType} size={64} />
          </motion.div>
          <div
            className="text-xs font-extrabold text-center px-2 py-0.5 rounded-full truncate max-w-[76px]"
            style={{ background: color, color: "white" }}
          >
            {vendor.characterName.split(" ")[0]}
          </div>
          <div
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: stageColor + "22",
              color: stageColor,
              border: `1.5px solid ${stageColor}55`,
            }}
          >
            {STAGE_LABELS[vendor.stage as VendorStage]}
          </div>
        </div>

        {/* Dialogue content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* Normal dialogue */}
            {dialogueState === "talking" && (
              <motion.div
                key="talking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                <div
                  className="text-sm font-semibold leading-relaxed mb-4 min-h-[56px]"
                  style={{ color: "var(--text)" }}
                >
                  {displayText}
                  {!textDone && (
                    <span className="typewriter-cursor" style={{ color: "var(--primary)" }}>
                      ▌
                    </span>
                  )}
                </div>
                {textDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2"
                  >
                    {choices.map((choice) => (
                      <motion.button
                        key={choice.label}
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={(e) => { e.stopPropagation(); handleChoice(choice); }}
                        className="px-4 py-2 rounded-2xl text-sm font-extrabold"
                        style={
                          choice.type === "close"
                            ? {
                                background: "var(--panel)",
                                color: "var(--muted)",
                                border: "2px solid var(--border-game)",
                              }
                            : choice.type === "accept"
                            ? {
                                background: "#34d399",
                                color: "white",
                                border: "2px solid #10b981",
                              }
                            : {
                                background: "var(--accent)",
                                color: "var(--text)",
                                border: "2px solid var(--accent-hover)",
                              }
                        }
                      >
                        {choice.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Negotiating loading */}
            {dialogueState === "negotiating" && (
              <motion.div
                key="negotiating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="text-3xl"
                >
                  🌀
                </motion.div>
                <div>
                  <div className="text-sm font-extrabold" style={{ color: "var(--primary-dark)" }}>
                    Drafting negotiation email...
                  </div>
                  <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    Claude is crafting the perfect pitch
                  </div>
                </div>
              </motion.div>
            )}

            {/* Draft review */}
            {dialogueState === "draft" && (
              <motion.div
                key="draft"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="text-xs font-extrabold" style={{ color: "var(--primary-dark)" }}>
                  📝 NEGOTIATION DRAFT — Review before sending
                </div>
                {editMode ? (
                  <textarea
                    value={editedDraft}
                    onChange={(e) => setEditedDraft(e.target.value)}
                    rows={4}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs leading-relaxed p-2.5 rounded-xl outline-none resize-none font-semibold"
                    style={{
                      background: "var(--panel)",
                      border: "2px solid var(--border-game)",
                      color: "var(--text)",
                    }}
                  />
                ) : (
                  <div
                    className="text-xs leading-relaxed font-semibold p-2.5 rounded-xl max-h-24 overflow-y-auto scrollable"
                    style={{
                      background: "var(--panel)",
                      border: "2px solid var(--border-game)",
                      color: "var(--text)",
                    }}
                  >
                    {draftText}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => { e.stopPropagation(); handleSendDraft(); }}
                    className="px-4 py-2 rounded-2xl text-sm font-extrabold"
                    style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                  >
                    ⚡ Send now
                  </motion.button>
                  {!editMode && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => { e.stopPropagation(); setEditMode(true); }}
                      className="px-4 py-2 rounded-2xl text-sm font-extrabold"
                      style={{ background: "var(--panel)", color: "var(--primary-dark)", border: "2px solid var(--border-game)" }}
                    >
                      ✏️ Edit first
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => { e.stopPropagation(); setDialogueState("talking"); setEditMode(false); }}
                    className="px-4 py-2 rounded-2xl text-sm font-extrabold"
                    style={{ background: "var(--panel)", color: "var(--muted)", border: "2px solid var(--border-game)" }}
                  >
                    Discard
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Sending */}
            {dialogueState === "sending" && (
              <motion.div
                key="sending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="text-3xl"
                >
                  📨
                </motion.div>
                <div className="text-sm font-extrabold" style={{ color: "var(--primary-dark)" }}>
                  Sending email...
                </div>
              </motion.div>
            )}

            {/* Success */}
            {dialogueState === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-3"
              >
                <div className="text-3xl">🎉</div>
                <div className="text-base font-extrabold" style={{ color: "var(--primary-dark)" }}>
                  {vendor.stage === "closed" ? "Deal closed! Congratulations!" : "Email sent! Now we wait..."}
                </div>
                <div className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                  {vendor.stage === "closed"
                    ? `${vendor.companyName} is officially your partner!`
                    : `Negotiation email sent to ${vendor.companyName}.`}
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="self-start px-4 py-2 rounded-2xl text-sm font-extrabold"
                  style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                >
                  Back to village
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom hint */}
      <div
        className="pb-3 text-center text-xs font-semibold"
        style={{ color: "var(--muted)" }}
      >
        Click to advance · Press Escape to close
      </div>
    </motion.div>
  );
}
