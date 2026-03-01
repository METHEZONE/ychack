"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useForageStore } from "@/lib/store";
import { ChatMessage } from "./ChatMessage";
import { playMessage, playChime, playForagingStart } from "@/lib/sounds";

type ChatMsg = Doc<"chatMessages">;

const FORAGE_KEYWORDS = [
  "find", "search", "look for", "source", "forage", "get me",
  "vendor", "supplier", "manufacturer", "factory", "producer",
  "packag", "bottl", "label", "distribut", "wholesale", "print",
];

function isForagingIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return FORAGE_KEYWORDS.some((k) => lower.includes(k));
}

export function ChatBar() {
  const userId = useForageStore((s) => s.userId);
  const chatOpen = useForageStore((s) => s.chatOpen);
  const toggleChat = useForageStore((s) => s.toggleChat);
  const agentBusy = useForageStore((s) => s.agentBusy);
  const agentStatus = useForageStore((s) => s.agentStatus);
  const setAgentBusy = useForageStore((s) => s.setAgentBusy);
  const activeQuestId = useForageStore((s) => s.activeQuestId);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.chatMessages.listByUserRecent,
    userId ? { userId, limit: 50 } : "skip"
  );

  const createMessage = useMutation(api.chatMessages.create);
  const generateResponse = useAction(api.actions.claude.generateChatResponse);
  const forageVendors = useAction(api.actions.forage.forageForVendors);
  const sendDraftReply = useAction(api.actions.agentmail.sendDraftReply);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleChoiceSelect(choice: string, metadata?: Record<string, unknown>) {
    if (!userId) return;

    // approve_reply: send the draft without going through the normal chat flow
    if (metadata?.action === "approve_reply" && choice === "Send reply ✓") {
      setAgentBusy(true, "Sending reply...");
      try {
        await sendDraftReply({
          draftMessageId: metadata.draftMessageId as Parameters<typeof sendDraftReply>[0]["draftMessageId"],
          vendorId: metadata.vendorId as Parameters<typeof sendDraftReply>[0]["vendorId"],
          toEmail: metadata.toEmail as string,
          inboxId: metadata.inboxId as string,
          subject: metadata.subject as string,
        });
        await createMessage({
          userId,
          role: "agent",
          content: "✅ Reply sent! I'll let you know when they respond again.",
        });
        playChime();
      } catch {
        await createMessage({
          userId,
          role: "agent",
          content: "❌ Failed to send reply. Try again from the message thread.",
        });
      } finally {
        setAgentBusy(false);
      }
      return;
    }

    // Default: treat choice as a chat message
    await handleSend(choice);
  }

  async function handleSend(text?: string) {
    const content = text ?? input.trim();
    if (!content || !userId || agentBusy) return;
    setInput("");
    playMessage();

    await createMessage({ userId, role: "user", content });

    const foraging = isForagingIntent(content);
    setAgentBusy(true, foraging ? "Foraging..." : "Thinking...");
    if (foraging) playForagingStart();

    try {
      if (foraging) {
        // Full agent pipeline: Browser Use → Convex → AgentMail
        // The action posts its own chat messages as progress updates
        await forageVendors({
          userId,
          questId: activeQuestId ?? undefined,
          searchQuery: content,
        });
        playChime();
      } else {
        // Regular Claude conversation
        const history = (messages ?? []).slice(-20).map((m: ChatMsg) => ({
          role: m.role as "user" | "agent",
          content: m.content,
        }));

        const result = await generateResponse({
          userMessage: content,
          conversationHistory: history,
        });

        await createMessage({
          userId,
          role: "agent",
          content: result.text,
          choices: result.choices,
        });
      }
    } catch {
      await createMessage({
        userId,
        role: "agent",
        content: "Sorry, something went wrong. Try again?",
      });
    } finally {
      setAgentBusy(false);
    }
  }

  return (
    <div
      className="border-t-4 flex flex-col transition-all duration-300"
      style={{
        borderColor: "var(--primary)",
        background: "var(--cream)",
        height: chatOpen ? 300 : 52,
        borderRadius: chatOpen ? "16px 16px 0 0" : undefined,
      }}
    >
      {/* Toggle bar — big chunky leaf button */}
      <button
        onClick={toggleChat}
        className="flex items-center gap-2.5 px-5 py-3.5 text-sm font-extrabold hover:bg-[#e8f5d0] transition-colors w-full text-left flex-shrink-0"
        style={{
          color: "var(--primary-dark)",
          borderRadius: chatOpen ? "12px 12px 0 0" : undefined,
        }}
      >
        <span className="text-lg">{agentBusy ? "🌀" : "🌿"}</span>
        <span>
          {agentBusy
            ? agentStatus
            : "Forage Agent"}
        </span>
        {agentBusy && (
          <span
            className="ml-1 w-2.5 h-2.5 rounded-full glow-pulse flex-shrink-0"
            style={{ background: "var(--primary)" }}
          />
        )}
        <span className="ml-auto text-xs font-bold" style={{ color: "var(--muted)" }}>
          {chatOpen ? "▼" : "▲"}
        </span>
      </button>

      {/* Messages + input */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto scrollable px-4 py-2 flex flex-col gap-3">
              {!messages || messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🌿</div>
                    <p className="text-sm font-bold" style={{ color: "var(--primary-dark)" }}>
                      Hi! I&apos;m Forage.
                    </p>
                    <p className="text-xs mt-1 font-semibold" style={{ color: "var(--muted)" }}>
                      Try: &quot;Find cotton fabric manufacturers in Vietnam&quot;
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg: ChatMsg, i: number) => (
                  <ChatMessage
                    key={msg._id}
                    role={msg.role as "user" | "agent"}
                    content={msg.content}
                    choices={msg.choices}
                    metadata={msg.metadata as Record<string, unknown> | undefined}
                    onChoiceSelect={(choice) => handleChoiceSelect(choice, msg.metadata as Record<string, unknown> | undefined)}
                    isLatest={i === messages.length - 1}
                  />
                ))
              )}
              {agentBusy && (
                <div className="flex gap-2 items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm"
                    style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
                  >
                    🌿
                  </div>
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm font-bold"
                    style={{
                      background: "#E8F5D0",
                      border: "2px solid var(--border-game)",
                      borderRadius: "18px 18px 18px 4px",
                    }}
                  >
                    <span className="animate-pulse">●</span>{" "}
                    <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>{" "}
                    <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input row */}
            <div className="flex gap-2 px-4 pb-4 pt-1 flex-shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={userId ? 'e.g. "Find glass bottle suppliers in China"' : "Complete onboarding first..."}
                disabled={agentBusy || !userId}
                className="flex-1 px-4 py-2.5 text-sm outline-none disabled:opacity-50 font-semibold"
                style={{
                  background: "var(--panel)",
                  border: "2.5px solid var(--border-game)",
                  borderRadius: 14,
                  color: "var(--text)",
                }}
              />
              <motion.button
                onClick={() => handleSend()}
                disabled={!input.trim() || agentBusy || !userId}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="px-4 py-2.5 text-sm font-extrabold disabled:opacity-40 transition-colors"
                style={{
                  background: "var(--primary)",
                  color: "white",
                  border: "2.5px solid var(--primary-dark)",
                  borderRadius: 14,
                }}
              >
                Send
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
