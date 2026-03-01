"use client";

import { motion } from "framer-motion";
import { STAGE_COLORS, VendorStage } from "@/lib/constants";

interface DealProgressProps {
  stage: VendorStage;
  formSubmitted?: boolean;
  emailSent?: boolean;
}

interface ProgressStep {
  key: VendorStage;
  label: string;
  description: string;
  icon: string;
}

const STEPS: ProgressStep[] = [
  {
    key: "discovered",
    label: "Discovered",
    description: "Vendor found by AI agent",
    icon: "🔍",
  },
  {
    key: "contacted",
    label: "Contacted",
    description: "Form submitted or email sent",
    icon: "📋",
  },
  {
    key: "replied",
    label: "Replied",
    description: "Vendor responded to inquiry",
    icon: "📨",
  },
  {
    key: "negotiating",
    label: "Negotiating",
    description: "Discussing terms & pricing",
    icon: "💬",
  },
  {
    key: "closed",
    label: "Deal Closed",
    description: "Partnership confirmed!",
    icon: "🤝",
  },
];

export function DealProgress({ stage, formSubmitted, emailSent }: DealProgressProps) {
  if (stage === "dead") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: "#fee2e2", border: "2px solid #fca5a5" }}
      >
        <span className="text-2xl">💀</span>
        <div>
          <div className="text-sm font-extrabold" style={{ color: "#dc2626" }}>
            Deal Dead
          </div>
          <div className="text-xs font-semibold" style={{ color: "#ef4444" }}>
            No response or not a fit
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === stage);

  return (
    <div className="space-y-1">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;
        const color = STAGE_COLORS[step.key];

        // Sub-status for "contacted" step
        let subStatus = "";
        if (step.key === "contacted") {
          if (formSubmitted && emailSent) subStatus = "Form + email sent";
          else if (formSubmitted) subStatus = "Form submitted";
          else if (emailSent) subStatus = "Email sent";
          else if (isCurrent) subStatus = "In progress...";
        }

        return (
          <div key={step.key} className="flex items-stretch gap-3">
            {/* Timeline column */}
            <div className="flex flex-col items-center w-8 flex-shrink-0">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.15 : 1,
                  backgroundColor: isCompleted || isCurrent ? color : "#e2e8f0",
                  borderColor: isCompleted || isCurrent ? color : "#cbd5e1",
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 flex-shrink-0"
                style={{ zIndex: 2 }}
              >
                {isCompleted ? (
                  <span style={{ color: "white", fontSize: 12, fontWeight: 800 }}>✓</span>
                ) : (
                  <span style={{ fontSize: 14 }}>{step.icon}</span>
                )}
              </motion.div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-0.5 flex-1 min-h-[16px]"
                  style={{
                    background: isCompleted
                      ? STAGE_COLORS[STEPS[i + 1].key]
                      : "#e2e8f0",
                  }}
                />
              )}
            </div>

            {/* Content column */}
            <div className={`pb-3 flex-1 min-w-0 ${isFuture ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-extrabold"
                  style={{
                    color: isCurrent ? color : isCompleted ? "var(--text)" : "var(--muted)",
                  }}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: color + "22", color }}
                  >
                    Current
                  </motion.span>
                )}
              </div>
              <div
                className="text-xs font-semibold mt-0.5"
                style={{ color: "var(--muted)" }}
              >
                {step.description}
              </div>
              {subStatus && (isCurrent || isCompleted) && (
                <div
                  className="text-xs font-bold mt-1 flex items-center gap-1"
                  style={{ color }}
                >
                  {isCurrent && !formSubmitted && !emailSent && (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="inline-block"
                    >
                      ⏳
                    </motion.span>
                  )}
                  {subStatus}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
