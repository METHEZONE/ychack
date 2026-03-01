"use client";

import { motion } from "framer-motion";
import { playClick } from "@/lib/sounds";

interface ChoiceButtonsProps {
  choices: string[];
  onSelect?: (choice: string) => void;
}

export function ChoiceButtons({ choices, onSelect }: ChoiceButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {choices.map((choice, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 22 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playClick();
            onSelect?.(choice);
          }}
          className="text-xs py-2.5 px-5 rounded-full font-extrabold transition-colors"
          style={{
            background: "var(--accent)",
            color: "var(--text)",
            border: "2.5px solid var(--accent-hover)",
          }}
        >
          {choice}
        </motion.button>
      ))}
    </div>
  );
}
