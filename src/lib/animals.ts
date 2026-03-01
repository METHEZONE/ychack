export type AnimalType =
  | "rabbit"
  | "lion"
  | "deer"
  | "fox";

// Note: "bear" (Gomi) is the permanent village mayor — NOT a vendor NPC
// Note: "milo" is the player character — NOT a vendor NPC
// Max 4 vendor NPCs
export const ANIMAL_TYPES: AnimalType[] = [
  "rabbit",
  "lion",
  "deer",
  "fox",
];

// Emoji fallbacks until sprite assets are ready
export const ANIMAL_EMOJI: Record<AnimalType, string> = {
  rabbit: "🐰",
  lion: "🦁",
  deer: "🦌",
  fox: "🦊",
};

// Colors for NPC name badges
export const ANIMAL_COLORS: Record<AnimalType, string> = {
  rabbit: "#e080a0",
  lion: "#c09030",
  deer: "#b09060",
  fox: "#e07040",
};

// NPC first names by animal type
const NPC_NAMES: Record<AnimalType, string[]> = {
  rabbit: ["Clover", "Hazel", "Bun", "Pip"],
  lion: ["Leo", "Simba", "Aslan", "Nala"],
  deer: ["Bambi", "Fern", "Buck", "Maple"],
  fox: ["Rex", "Fiona", "Rusty", "Vixen"],
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
