"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, DataModel } from "../../../convex/_generated/dataModel";

type MessageDoc = DataModel["messages"];

interface EmailThreadProps {
  vendorId: Id<"vendors">;
}

export function EmailThread({ vendorId }: EmailThreadProps) {
  const messages = useQuery(api.messages.listByVendor, { vendorId });

  if (!messages || messages.length === 0) {
    return (
      <div
        className="text-center py-8 text-sm"
        style={{ color: "var(--muted)" }}
      >
        <div className="text-3xl mb-2">📬</div>
        No messages yet. Forage will contact them soon!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg: MessageDoc) => {
        const isOutbound = msg.direction === "outbound";
        return (
          <div
            key={msg._id}
            className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
              style={
                isOutbound
                  ? {
                      background: "var(--primary)",
                      color: "white",
                      borderTopRightRadius: 4,
                    }
                  : {
                      background: "var(--surface)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderTopLeftRadius: 4,
                    }
              }
            >
              {msg.subject && (
                <div className="font-semibold text-xs mb-1 opacity-75">
                  {msg.subject}
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
              <div
                className="text-xs mt-2 opacity-60"
              >
                {msg.isDraft ? "📝 Draft" : msg.type === "form_submission" ? "📋 Form submitted" : "✉️ Email"}
                {msg.sentAt && (
                  <> · {new Date(msg.sentAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
