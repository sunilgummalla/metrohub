/**
 * Word lists used to generate:
 *   - Game join codes:   adjective-noun-NN  (lowercase, e.g. "disco-panda-42")
 *   - Guest handles:     AdjectiveNounNN    (PascalCase, e.g. "DiscoPanda42")
 *
 * Total unique codes: 100 × 100 × 100 = 1,000,000
 */

export const ADJECTIVES: readonly string[] = [
  // Energetic / fun
  "disco", "funky", "wild", "crazy", "lazy", "spicy", "cheeky", "bouncy",
  "groovy", "zesty", "snappy", "breezy", "peppy", "zippy", "jolly", "quirky",
  "sassy", "nifty", "dandy", "plucky",
  // Colours / vibes
  "golden", "silver", "crimson", "indigo", "scarlet", "amber", "cobalt",
  "tawny", "jade", "coral",
  // Size / intensity
  "mighty", "tiny", "grand", "swift", "bold", "brave", "calm", "fierce",
  "gentle", "loud",
  // Texture / feel
  "fluffy", "silky", "crunchy", "soggy", "crispy", "fuzzy", "glossy",
  "velvety", "sparkly", "shiny",
  // Nature
  "stormy", "sunny", "frosty", "misty", "dewy", "snowy", "leafy",
  "rocky", "sandy", "cloudy",
  // Personality
  "witty", "clumsy", "grumpy", "cheerful", "sleepy", "hungry", "thirsty",
  "curious", "nervous", "lucky",
  // Misc fun
  "cosmic", "electric", "magnetic", "atomic", "turbo", "mega", "ultra",
  "super", "hyper", "epic",
  // Sensory
  "tangy", "minty", "smoky", "buttery", "toasty", "fizzy", "bubbly",
  "creamy", "chewy", "zappy",
  // Extra (to reach 100)
  "dapper", "snazzy", "jazzy", "wacky", "zany", "rowdy",
  "swanky", "punchy", "gritty", "lively",
];

export const NOUNS: readonly string[] = [
  // Animals (20)
  "panda", "tiger", "koala", "otter", "llama", "gecko", "dingo",
  "capybara", "axolotl", "quokka", "narwhal", "platypus", "tapir",
  "meerkat", "wombat", "fennec", "ocelot", "manatee", "pangolin", "binturong",

  // Marvel heroes (15)
  "spidey", "hulk", "thor", "loki", "wanda", "rocket", "groot",
  "panther", "falcon", "vision", "gamora", "nebula", "drax", "mantis", "nova",

  // Popular cities (15)
  "tokyo", "paris", "dubai", "sydney", "mumbai", "nairobi", "lisbon",
  "bogota", "oslo", "kyoto", "cairo", "havana", "reykjavik", "tbilisi", "hanoi",

  // Places of interest (15)
  "colosseum", "louvre", "machu", "angkor", "alhambra", "parthenon",
  "stonehenge", "petra", "everest", "fuji", "santorini", "cappadocia",
  "serengeti", "galapagos", "patagonia",

  // Fruits (15)
  "mango", "lychee", "papaya", "guava", "kiwi", "lemon", "cherry",
  "melon", "peach", "plum", "dragonfruit", "starfruit", "jackfruit",
  "persimmon", "tamarind",

  // Vegetables (10)
  "carrot", "broccoli", "spinach", "radish", "turnip", "beetroot",
  "kale", "zucchini", "parsnip", "leek",

  // Grocery / pantry (10)
  "cheddar", "pretzel", "waffle", "noodle", "muffin", "biscuit",
  "pickle", "tahini", "granola", "kimchi",
];

// ─── Generators ───────────────────────────────────────────────────────────────

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Generate a game join code.
 * Format: adjective-noun-NN  (all lowercase, e.g. "disco-panda-42")
 */
export function generateJoinCode(): string {
  const adj = randomItem(ADJECTIVES);
  const noun = randomItem(NOUNS);
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${pad2(num)}`;
}

/**
 * Generate a guest handle.
 * Format: AdjectiveNounNN  (PascalCase, e.g. "DiscoPanda42")
 */
export function generateGuestHandle(): string {
  const adj = randomItem(ADJECTIVES);
  const noun = randomItem(NOUNS);
  const num = Math.floor(Math.random() * 100);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(adj)}${cap(noun)}${pad2(num)}`;
}
