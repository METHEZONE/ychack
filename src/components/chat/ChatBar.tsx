"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DataModel } from "../../../convex/_generated/dataModel";
import { useForageStore } from "@/lib/store";
import { ChatMessage } from "./ChatMessage";

type ChatMsg = DataModel["chatMessages"];

export function ChatBar() {
  const userId = useForageStore((s) => s.userId);
  const chatOpen = useForageStore((s) => s.chatOpen);
  const toggleChat = useForageStore((s) => s.toggleChat);
  const agentBusy = useForageStore((s) => s.agentBusy);
  const setAgentBusy = useForageStore((s) => s.setAgentBusy);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.chatMessages.listByUserRecent,
    userId ? { userId, limit: 50 } : "skip"
  );

  const createMessage = useMutation(api.chatMessages.create);
  const generateResponse = useAction(api.actions.claude.generateChatResponse);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const content = text ?? input.trim();
    if (!content || !userId || agentBusy) return;
    setInput("");

    // Save user message
    await createMessage({ userId, role: "user", content });

    // Get AI response
    setAgentBusy(true, "Thinking...");
    try {
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
    } catch (err) {
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
      className="border-t flex flex-col transition-all duration-300"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        height: chatOpen ? 280 : 48,
      }}
    >
      {/* Toggle bar */}
      <button
        onClick={toggleChat}
        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-[var(--surface-hover)] transition-colors w-full text-left flex-shrink-0"
        style={{ color: "var(--foreground)" }}
      >
        <span>{agentBusy ? "🌀" : "🌿"}</span>
        <span>
          {agentBusy
            ? useForageStore.getState().agentStatus
            : "Forage Agent"}
        </span>
        <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
          {chatOpen ? "▼" : "▲"}
        </span>
      </button>

      {/* Messages + input */}
      {chatOpen && (
        <>
          <div
            className="flex-1 overflow-y-auto scrollable px-4 py-2 flex flex-col gap-3"
          >
            {!messages || messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-3xl mb-2">🌿</div>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Hi! I&apos;m Forage. Tell me what you need to source and
                    I&apos;ll find the best vendors for you.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg: ChatMsg) => (
                <ChatMessage
                  key={msg._id}
                  role={msg.role as "user" | "agent"}
                  content={msg.content}
                  choices={msg.choices}
                  onChoiceSelect={(choice) => handleSend(choice)}
                />
              ))
            )}
            {agentBusy && (
              <div className="flex gap-2 items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: "var(--primary)", color: "white" }}
                >
                  🌿
                </div>
                <div
                  className="px-3 py-2 rounded-2xl text-sm"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
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

          {/* Input */}
          <div
            className="flex gap-2 px-4 pb-3 pt-1 flex-shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask Forage to find vendors..."
              disabled={agentBusy || !userId}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none disabled:opacity-50"
              style={{
                background: "var(--background)",
                border: "1.5px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || agentBusy || !userId}
              className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors"
              style={{
                background: "var(--primary)",
                color: "white",
              }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
