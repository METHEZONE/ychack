"use client";

interface ChoiceButtonsProps {
  choices: string[];
  onSelect?: (choice: string) => void;
}

export function ChoiceButtons({ choices, onSelect }: ChoiceButtonsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {choices.map((choice, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(choice)}
          className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            background: "var(--surface)",
            color: "var(--primary-dark)",
            border: "1.5px solid var(--primary)",
          }}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
