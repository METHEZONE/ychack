"use client";

import { ChoiceButtons } from "./ChoiceButtons";

interface ChatMessageProps {
  role: "user" | "agent";
  content: string;
  choices?: string[];
  onChoiceSelect?: (choice: string) => void;
}

export function ChatMessage({ role, content, choices, onChoiceSelect }: ChatMessageProps) {
  const isAgent = role === "agent";

  return (
    <div className={`flex gap-2 ${isAgent ? "justify-start" : "justify-end"}`}>
      {isAgent && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
          style={{ background: "var(--primary)", color: "white" }}
        >
          🌿
        </div>
      )}
      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isAgent ? "items-start" : "items-end"}`}>
        <div
          className="px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
          style={
            isAgent
              ? {
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderTopLeftRadius: 4,
                }
              : {
                  background: "var(--primary)",
                  color: "white",
                  borderTopRightRadius: 4,
                }
          }
        >
          {content}
        </div>
        {choices && choices.length > 0 && isAgent && (
          <ChoiceButtons choices={choices} onSelect={onChoiceSelect} />
        )}
      </div>
    </div>
  );
}
