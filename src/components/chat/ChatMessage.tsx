"use client";

import { ChoiceButtons } from "./ChoiceButtons";

interface ChatMessageProps {
  role: "user" | "agent";
  content: string;
  choices?: string[];
  onChoiceSelect?: (choice: string) => void;
  isLatest?: boolean;
}

export function ChatMessage({ role, content, choices, onChoiceSelect, isLatest }: ChatMessageProps) {
  const isAgent = role === "agent";

  return (
    <div className={`flex gap-2 ${isAgent ? "justify-start" : "justify-end"}`}>
      {isAgent && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5 shadow-sm"
          style={{ background: "var(--primary)", color: "white", border: "2px solid var(--primary-dark)" }}
        >
          🌿
        </div>
      )}
      <div className={`flex flex-col gap-1.5 max-w-[82%] ${isAgent ? "items-start" : "items-end"}`}>
        <div
          className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap font-semibold"
          style={
            isAgent
              ? {
                  background: "#E8F5D0",
                  color: "#3D8A35",
                  border: "2px solid var(--border-game)",
                  borderRadius: "18px 18px 18px 4px",
                }
              : {
                  background: "var(--primary)",
                  color: "white",
                  borderRadius: "18px 18px 4px 18px",
                }
          }
        >
          {content}
          {isAgent && isLatest && (
            <span
              className="inline-block w-0.5 h-3.5 ml-0.5 align-middle"
              style={{
                background: "#3D8A35",
                animation: "blink 1s step-end infinite",
              }}
            />
          )}
        </div>
        {choices && choices.length > 0 && isAgent && (
          <ChoiceButtons choices={choices} onSelect={onChoiceSelect} />
        )}
      </div>
    </div>
  );
}
