"use client";

import { getSpriteSheet, HEAD_CROP_FRACTION } from "@/lib/sprites";
import { ANIMAL_EMOJI } from "@/lib/animals";
import { AnimalType } from "@/lib/animals";

interface SpriteHeadProps {
  animalType: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders the head portrait of an NPC by cropping frame 0 of its sprite sheet.
 * Uses CSS background-image + background-position (pixelated rendering).
 * Falls back to emoji if no sprite sheet is found.
 */
export function SpriteHead({ animalType, size = 56, className, style }: SpriteHeadProps) {
  const sheet = getSpriteSheet(animalType);

  if (!sheet) {
    const emoji = ANIMAL_EMOJI[animalType as AnimalType] ?? "🐾";
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.6,
          ...style,
        }}
      >
        {emoji}
      </div>
    );
  }

  const frame = sheet.frames[0]; // forward-facing portrait frame
  const scale = size / frame.w;
  const displayH = frame.h * scale;
  const cropFraction = HEAD_CROP_FRACTION[animalType] ?? 0.4;
  const cropH = Math.round(displayH * cropFraction);

  // CSS background-image offset to show only frame 0
  const bgX = -frame.x * scale;
  const bgY = -frame.y * scale;
  const bgW = sheet.sheetW * scale;
  const bgH = sheet.sheetH * scale;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: cropH,
        overflow: "hidden",
        flexShrink: 0,
        imageRendering: "pixelated",
        ...style,
      }}
    >
      <div
        style={{
          width: size,
          height: displayH,
          backgroundImage: `url(${sheet.src})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: `${bgX}px ${bgY}px`,
          backgroundSize: `${bgW}px ${bgH}px`,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
