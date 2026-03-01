"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForageStore } from "@/lib/store";
import { playForagingStart, playChime, playClick, playDialogueBlip, playMessage } from "@/lib/sounds";

const QUICK_SEARCHES = [
  "Cotton fabric manufacturers in Vietnam",
  "Glass bottle suppliers in China",
  "Eco packaging suppliers in Europe",
  "Custom label printers in USA",
  "Sticker manufacturers in Shenzhen",
];

const GREETING_TEXT =
  "Hey there! I'm Forage — your sourcing agent. Tell me what you're looking for and I'll scout the web for real vendors. You can be specific or vague — I'll figure it out!";

type ChatMessage = {
  role: "agent" | "user";
  content: string;
  choices?: string[];
  pendingQuery?: string; // query to forage if user picks a choice
};

interface ForageSearchProps {
  onClose: () => void;
}

export function ForageSearch({ onClose }: ForageSearchProps) {
  const userId = useForageStore((s) => s.userId);
  const activeQuestId = useForageStore((s) => s.activeQuestId);
  const agentBusy = useForageStore((s) => s.agentBusy);
  const setAgentBusy = useForageStore((s) => s.setAgentBusy);

  const [input, setInput] = useState("");
  const [isForaging, setIsForaging] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const forageVendors = useAction(api.actions.forage.forageForVendors);
  const generateChatResponse = useAction(api.actions.claude.generateChatResponse);

  // Typewriter greeting
  useEffect(() => {
    setGreetingVisible(true);
    let i = 0;
    const blipInterval = 3;
    const iv = setInterval(() => {
      if (i >= GREETING_TEXT.length) {
        clearInterval(iv);
        return;
      }
      setGreetingText(GREETING_TEXT.slice(0, i + 1));
      if (i % blipInterval === 0) playDialogueBlip("fox");
      i++;
    }, 28);
    return () => clearInterval(iv);
  }, []);

  // Focus input after greeting starts
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  // Directly forage — no chat step
  async function doForage(q: string) {
    if (!q || !userId || agentBusy) return;
    setIsForaging(true);
    setAgentBusy(true, "Foraging...");
    playForagingStart();
    try {
      await forageVendors({
        userId,
        questId: activeQuestId ?? undefined,
        searchQuery: q,
      });
      playChime();
      onClose();
    } catch {
      // stay open on error
    } finally {
      setIsForaging(false);
      setAgentBusy(false);
    }
  }

  // Chat-first: ask Claude for refinement choices, then forage
  async function handleSearch(query?: string) {
    const q = query ?? input.trim();
    if (!q || !userId || agentBusy) return;
    setInput("");

    // Add user message to chat
    const userMsg: ChatMessage = { role: "user", content: q };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    playMessage?.();

    try {
      const result = await generateChatResponse({
        userMessage: `The user wants to forage for vendors. Their search query is: "${q}"\n\nOffer 3-4 refined search variations as choices (different regions, specs, or approaches). One option must always be 'Search as-is: ${q}'. Format choices as complete, ready-to-search strings starting with 🔍.`,
        conversationHistory: chatMessages.map((m) => ({ role: m.role, content: m.content })),
        userContext: { mode: "search_refinement" },
      });

      const agentMsg: ChatMessage = {
        role: "agent",
        content: result.text,
        choices: result.choices ?? [`🔍 Search as-is: ${q}`],
        pendingQuery: q,
      };
      setChatMessages((prev) => [...prev, agentMsg]);
      playDialogueBlip("fox");
    } catch {
      // Claude failed — forage directly
      await doForage(q);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  // User clicks a choice → extract query (strip leading emoji + label) and forage
  async function handleChoiceClick(choice: string, pendingQuery: string) {
    playClick();
    // Strip "🔍 Search as-is: " or "🔍 " prefix to get the raw query
    const cleanChoice = choice.replace(/^🔍\s*(Search as-is:\s*)?/i, "").trim();
    const finalQuery = cleanChoice || pendingQuery;

    const userMsg: ChatMessage = { role: "user", content: choice };
    setChatMessages((prev) => [...prev, userMsg]);
    await doForage(finalQuery);
  }

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        background: "var(--parchment)",
        borderTop: "4px solid var(--wood-outer)",
        boxShadow: "inset 0 2px 0 var(--wood-light), 0 -6px 0 var(--pixel-shadow)",
        minHeight: 220,
      }}
    >
      {/* Header */}
      <div className="pixel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🌿</span>
          <span style={{ fontSize: 8 }}>FORAGE AGENT HQ</span>
        </div>
        <button
          className="pixel-btn"
          style={{ padding: "3px 8px", fontSize: 12 }}
          onClick={() => { playClick(); onClose(); }}
        >
          ✕
        </button>
      </div>

      {/* Greeting / Chat history */}
      <div className="px-5 pb-2 max-h-60 overflow-y-auto">
        {/* Greeting (only when no chat yet) */}
        {chatMessages.length === 0 && (
          <div className="text-sm font-semibold leading-relaxed min-h-[40px] mb-2" style={{ color: "var(--text)" }}>
            {greetingText}
            {greetingText.length < GREETING_TEXT.length && (
              <span className="typewriter-cursor" style={{ color: "var(--primary)" }}>▌</span>
            )}
          </div>
        )}

        {/* Chat messages */}
        {chatMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-2`}
          >
            <div className="flex flex-col gap-1.5 max-w-[90%]">
              <div
                className="px-3 py-2 rounded-2xl text-xs font-semibold leading-relaxed"
                style={msg.role === "user"
                  ? { background: "var(--primary)", color: "white", borderRadius: "16px 16px 4px 16px" }
                  : { background: "var(--panel)", color: "var(--text)", border: "1.5px solid var(--border-game)", borderRadius: "16px 16px 16px 4px" }
                }
              >
                {msg.content}
              </div>
              {/* Choice buttons below agent message */}
              {msg.role === "agent" && msg.choices && (
                <div className="flex flex-col gap-1">
                  {msg.choices.map((choice, ci) => (
                    <motion.button
                      key={ci}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleChoiceClick(choice, msg.pendingQuery ?? "")}
                      disabled={isForaging || agentBusy || chatLoading}
                      className="pixel-btn pixel-btn-green text-left disabled:opacity-40"
                      style={{ fontSize: 8, padding: "6px 10px" }}
                    >
                      {choice}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Loading indicator */}
        {chatLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-2">
            <div className="px-3 py-2 rounded-2xl text-xs" style={{ background: "var(--panel)", border: "1.5px solid var(--border-game)" }}>
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }}>
                🌿 thinking...
              </motion.span>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick search chips (only when no conversation started) */}
      {chatMessages.length === 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {QUICK_SEARCHES.map((s) => (
            <motion.button
              key={s}
              whileTap={{ scale: 0.93 }}
              onClick={() => { playClick(); doForage(s); }}
              disabled={isForaging || agentBusy}
              className="pixel-btn disabled:opacity-50"
              style={{ fontSize: 8, padding: "5px 10px" }}
            >
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input + send */}
      <div className="flex gap-2 px-4 pb-4">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder='e.g. bamboo toothbrush suppliers China'
          disabled={isForaging || agentBusy}
          className="flex-1 px-3 py-2.5 text-sm disabled:opacity-50 pixel-input"
          style={{ fontFamily: "var(--font-nunito), sans-serif", fontWeight: 600 }}
        />
        <motion.button
          onClick={() => handleSearch()}
          disabled={!input.trim() || isForaging || agentBusy}
          whileTap={{ scale: 0.93 }}
          className="pixel-btn pixel-btn-green px-3 py-2 disabled:opacity-40"
        >
          {isForaging ? "🌀" : "🔍 FORAGE"}
        </motion.button>
      </div>

      {isForaging && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center rounded-[20px]"
            style={{ background: "rgba(255,251,230,0.92)", backdropFilter: "blur(4px)" }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="text-4xl mb-3"
              >
                🌿
              </motion.div>
              <div className="text-sm font-extrabold" style={{ color: "var(--primary-dark)" }}>
                Foraging the web...
              </div>
              <div className="text-xs font-semibold mt-1" style={{ color: "var(--muted)" }}>
                Scouting vendors for you
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
