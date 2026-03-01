export interface SpriteFrame {
  x: number; y: number; w: number; h: number;
}

export interface SpriteSheet {
  src: string;
  sheetW: number; sheetH: number;
  frames: SpriteFrame[];
}

// foxi.png — Fox in suit (2784×1536), 2 rows × 4 frames
export const FOXI: SpriteSheet = {
  src: "/assets/foxi.png",
  sheetW: 2784, sheetH: 1536,
  frames: [
    { x: 789, y: 154, w: 391, h: 472 }, // 0 — forward
    { x: 126, y: 178, w: 381, h: 448 }, // 1 — walk A
    { x: 2142, y: 178, w: 381, h: 448 }, // 2 — walk B
    { x: 1466, y: 179, w: 385, h: 447 }, // 3 — walk C
    { x: 784, y: 865, w: 396, h: 501 }, // 4 — side A
    { x: 114, y: 872, w: 394, h: 494 }, // 5 — side B
    { x: 1461, y: 872, w: 399, h: 494 }, // 6 — side C
    { x: 2135, y: 872, w: 393, h: 496 }, // 7 — side D
  ],
};

// rabi.png — Rabbit in dress (2720×1568), 2 rows × 4 frames
export const RABI: SpriteSheet = {
  src: "/assets/rabi.png",
  sheetW: 2720, sheetH: 1568,
  frames: [
    { x: 247, y: 190, w: 215, h: 443 }, // 0
    { x: 911, y: 190, w: 215, h: 443 }, // 1
    { x: 1573, y: 190, w: 214, h: 443 }, // 2
    { x: 2214, y: 190, w: 215, h: 434 }, // 3
    { x: 892, y: 834, w: 239, h: 500 }, // 4
    { x: 1538, y: 834, w: 248, h: 503 }, // 5
    { x: 2178, y: 834, w: 270, h: 503 }, // 6
    { x: 225, y: 847, w: 255, h: 476 }, // 7
  ],
};

// gomi.png — Bear in sweater (5184×832), 1 row × 8 frames (sorted by x)
export const GOMI: SpriteSheet = {
  src: "/assets/gomi.png",
  sheetW: 5184, sheetH: 832,
  frames: [
    { x: 168, y: 78, w: 423, h: 713 },  // 0
    { x: 794, y: 78, w: 420, h: 713 },  // 1
    { x: 1365, y: 78, w: 421, h: 713 }, // 2
    { x: 1962, y: 75, w: 420, h: 716 }, // 3
    { x: 2707, y: 72, w: 441, h: 728 }, // 4
    { x: 3347, y: 72, w: 442, h: 727 }, // 5
    { x: 3990, y: 72, w: 443, h: 726 }, // 6
    { x: 4609, y: 71, w: 445, h: 733 }, // 7
  ],
};

export function getSpriteSheet(animalType: string): SpriteSheet | null {
  switch (animalType) {
    case "fox": return FOXI;
    case "rabbit": return RABI;
    case "bear":
    case "raccoon": return GOMI;
    default: return null;
  }
}
