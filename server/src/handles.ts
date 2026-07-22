const ADJECTIVES = [
  "Wandering", "Silent", "Crimson", "Lunar", "Umbral", "Gilded", "Feral", "Hollow",
  "Sable", "Radiant", "Drifting", "Ashen", "Verdant", "Stray", "Molten", "Frostbound",
  "Nameless", "Woven", "Errant", "Twilight",
];

const NOUNS = [
  "Ember", "Quill", "Comet", "Warden", "Sparrow", "Lantern", "Cipher", "Willow",
  "Beacon", "Fox", "Raven", "Tide", "Loom", "Archivist", "Cartographer", "Moth",
  "Sextant", "Herald", "Anchor", "Spindle",
];

export function randomHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${noun}-${num}`;
}
