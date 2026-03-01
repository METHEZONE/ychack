"use client";

import { useState, useEffect, useCallback } from "react";

interface ToastMessage {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

// Simple global toast store (no extra dep needed)
let listeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

function notify(newToasts: ToastMessage[]) {
  toasts = newToasts;
  listeners.forEach((l) => l(toasts));
}

export function showToast(message: string, type: ToastMessage["type"] = "info") {
  const id = Math.random().toString(36).slice(2);
  notify([...toasts, { id, message, type }]);
  setTimeout(() => {
    notify(toasts.filter((t) => t.id !== id));
  }, 4000);
}

const TOAST_STYLES: Record<ToastMessage["type"], string> = {
  info: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
};

const TOAST_EMOJI: Record<ToastMessage["type"], string> = {
  info: "💬",
  success: "✅",
  warning: "⚠️",
  error: "❌",
};

export function ToastContainer() {
  const [activeToasts, setActiveToasts] = useState<ToastMessage[]>([]);

  const handleUpdate = useCallback((updated: ToastMessage[]) => {
    setActiveToasts([...updated]);
  }, []);

  useEffect(() => {
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, [handleUpdate]);

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium pointer-events-auto"
          style={{
            background: "white",
            borderLeft: `4px solid ${TOAST_STYLES[toast.type]}`,
            color: "var(--foreground)",
            maxWidth: 320,
            animation: "slideIn 0.2s ease-out",
          }}
        >
          <span>{TOAST_EMOJI[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
