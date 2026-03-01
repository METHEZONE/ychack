export type AnimalType =
  | "fox"
  | "raccoon"
  | "frog"
  | "rabbit"
  | "squirrel"
  | "deer"
  | "owl"
  | "hedgehog"
  | "cat"
  | "lion";

// Note: "bear" (Gomi) is the permanent village mayor — NOT a vendor NPC
// Note: "milo" is the player character — NOT a vendor NPC
export const ANIMAL_TYPES: AnimalType[] = [
  "fox",
  "raccoon",
  "rabbit",
  "deer",
  "lion",
  "frog",
  "squirrel",
  "owl",
  "hedgehog",
  "cat",
];

// Emoji fallbacks until sprite assets are ready
export const ANIMAL_EMOJI: Record<AnimalType, string> = {
  fox: "🦊",
  raccoon: "🦝",
  frog: "🐸",
  rabbit: "🐰",
  squirrel: "🐿️",
  deer: "🦌",
  owl: "🦉",
  hedgehog: "🦔",
  cat: "🐱",
  lion: "🦁",
};

// Colors for NPC name badges
export const ANIMAL_COLORS: Record<AnimalType, string> = {
  fox: "#e07040",
  raccoon: "#607080",
  frog: "#50a060",
  rabbit: "#e080a0",
  squirrel: "#c07030",
  deer: "#b09060",
  owl: "#7060a0",
  hedgehog: "#806050",
  cat: "#a080c0",
  lion: "#c09030",
};

// NPC first names by animal type
const NPC_NAMES: Record<AnimalType, string[]> = {
  fox: ["Rex", "Fiona", "Rusty", "Vixen"],
  raccoon: ["Rocky", "Bandit", "Remy", "Scout"],
  frog: ["Hop", "Lilly", "Croaker", "Jade"],
  rabbit: ["Clover", "Hazel", "Bun", "Pip"],
  squirrel: ["Acorn", "Hazel", "Chip", "Nutmeg"],
  deer: ["Bambi", "Fern", "Buck", "Maple"],
  owl: ["Hoot", "Sage", "Wren", "Luna"],
  hedgehog: ["Spike", "Bramble", "Prick", "Holly"],
  cat: ["Mochi", "Biscuit", "Nori", "Pesto"],
  lion: ["Leo", "Simba", "Aslan", "Nala"],
};

let usedAnimals = new Set<string>();

export function assignAnimal(vendorIndex: number): {
  animalType: AnimalType;
  characterName: string;
} {
  const animalType = ANIMAL_TYPES[vendorIndex % ANIMAL_TYPES.length];
  const names = NPC_NAMES[animalType];
  const nameIndex = Math.floor(vendorIndex / ANIMAL_TYPES.length) % names.length;
  const characterName = names[nameIndex];
  return { animalType, characterName };
}

export function randomAnimal(): { animalType: AnimalType; characterName: string } {
  const animalType = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
  const names = NPC_NAMES[animalType];
  const characterName = names[Math.floor(Math.random() * names.length)];
  return { animalType, characterName };
}

export function resetAnimalAssignments() {
  usedAnimals = new Set();
}
