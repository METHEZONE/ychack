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

// deer.png — Deer (1563×1563), 2 rows × 4 frames (sprite6 is blank, skipped)
export const DEER: SpriteSheet = {
  src: "/assets/deer.png",
  sheetW: 1563, sheetH: 1563,
  frames: [
    { x: 505, y: 410, w: 162, h: 323 }, // 0 — idle / walk A
    { x: 883, y: 415, w: 162, h: 323 }, // 1 — walk B
    { x: 128, y: 416, w: 161, h: 320 }, // 2 — walk C
    { x: 1260, y: 418, w: 162, h: 320 }, // 3 — walk D
    { x: 501, y: 801, w: 162, h: 318 }, // 4 — walk E
    { x: 124, y: 806, w: 164, h: 312 }, // 5 — walk F
    { x: 885, y: 807, w: 163, h: 312 }, // 6 — walk G
    { x: 1260, y: 807, w: 162, h: 312 }, // 7 — walk H
  ],
};

// milo.png — Milo (1563×1563), 2 rows × 4 frames, frame 0 is larger portrait
export const MILO: SpriteSheet = {
  src: "/assets/milo.png",
  sheetW: 1563, sheetH: 1563,
  frames: [
    { x: 461, y: 385, w: 306, h: 456 }, // 0 — portrait / idle (wider)
    { x: 833, y: 385, w: 252, h: 461 }, // 1 — walk A
    { x: 1139, y: 390, w: 253, h: 454 }, // 2 — walk B
    { x: 157, y: 391, w: 250, h: 449 }, // 3 — walk C
    { x: 852, y: 996, w: 242, h: 462 }, // 4 — walk D
    { x: 1158, y: 996, w: 243, h: 461 }, // 5 — walk E
    { x: 140, y: 997, w: 263, h: 464 }, // 6 — walk F
    { x: 523, y: 997, w: 256, h: 463 }, // 7 — walk G
  ],
};

// lion.png — Lion (2048×2048), frame 0 is large portrait, frames 1-7 are walk cycle
export const LION: SpriteSheet = {
  src: "/assets/lion.png",
  sheetW: 2048, sheetH: 2048,
  frames: [
    { x: 1500, y: 0, w: 548, h: 966 }, // 0 — large portrait
    { x: 663, y: 580, w: 206, h: 380 }, // 1 — walk A
    { x: 168, y: 582, w: 205, h: 383 }, // 2 — walk B
    { x: 1161, y: 586, w: 204, h: 381 }, // 3 — walk C
    { x: 663, y: 1093, w: 202, h: 374 }, // 4 — walk D
    { x: 167, y: 1096, w: 205, h: 369 }, // 5 — walk E
    { x: 1162, y: 1097, w: 204, h: 368 }, // 6 — walk F
    { x: 1653, y: 1100, w: 204, h: 366 }, // 7 — walk G
  ],
};

// Fraction of frame 0 height that contains just the head
export const HEAD_CROP_FRACTION: Record<string, number> = {
  fox: 0.42,      // foxi frame 0: h=472, head ~top 200px
  rabbit: 0.40,   // rabi frame 0: h=443
  deer: 0.42,     // deer frame 0: h=323
  lion: 0.30,     // lion frame 0: h=966 (very tall portrait)
  bear: 0.32,     // gomi frame 0: h=713
  raccoon: 0.32,  // gomi (same sheet as bear)
  milo: 0.38,     // milo frame 0: h=456
};

export function getSpriteSheet(animalType: string): SpriteSheet | null {
  switch (animalType) {
    case "fox": return FOXI;
    case "rabbit": return RABI;
    case "bear":
    case "raccoon": return GOMI;
    case "deer": return DEER;
    case "milo": return MILO;
    case "lion": return LION;
    default: return null;
  }
}
