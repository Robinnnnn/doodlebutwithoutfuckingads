export const POLL_SLUG_WORDS = [
  "acorn",
  "amber",
  "apple",
  "apricot",
  "arch",
  "aster",
  "atlas",
  "autumn",
  "badger",
  "bamboo",
  "beacon",
  "beaver",
  "berry",
  "birch",
  "bison",
  "bloom",
  "blue",
  "breeze",
  "bright",
  "brook",
  "button",
  "cabin",
  "cactus",
  "calm",
  "canyon",
  "cedar",
  "cherry",
  "cinder",
  "citrus",
  "clear",
  "clover",
  "cloud",
  "cobalt",
  "comet",
  "coral",
  "cosmos",
  "cove",
  "crane",
  "crisp",
  "daisy",
  "dawn",
  "delta",
  "dove",
  "drift",
  "dune",
  "eagle",
  "earth",
  "ember",
  "fern",
  "field",
  "finch",
  "fjord",
  "flame",
  "flora",
  "forest",
  "fox",
  "frost",
  "garden",
  "gentle",
  "ginger",
  "glade",
  "glass",
  "glen",
  "gold",
  "granite",
  "grape",
  "green",
  "grove",
  "harbor",
  "hazel",
  "heron",
  "hill",
  "honey",
  "indigo",
  "iris",
  "island",
  "ivory",
  "jade",
  "juniper",
  "kite",
  "lake",
  "lark",
  "laurel",
  "leaf",
  "lemon",
  "lilac",
  "lily",
  "linen",
  "lotus",
  "lucky",
  "luna",
  "maple",
  "marble",
  "meadow",
  "melon",
  "mint",
  "mist",
  "moon",
  "moss",
  "nectar",
  "nest",
  "north",
  "nova",
  "oasis",
  "ocean",
  "olive",
  "onyx",
  "opal",
  "orange",
  "orchid",
  "otter",
  "owl",
  "panda",
  "paper",
  "peach",
  "pearl",
  "pebble",
  "pepper",
  "pine",
  "plum",
  "pond",
  "poppy",
  "prairie",
  "quartz",
  "quiet",
  "rain",
  "raven",
  "reef",
  "river",
  "robin",
  "rose",
  "ruby",
  "sage",
  "sand",
  "satin",
  "scarlet",
  "sea",
  "shell",
  "shore",
  "silver",
  "sky",
  "slate",
  "snow",
  "solar",
  "sparrow",
  "spring",
  "spruce",
  "star",
  "stone",
  "storm",
  "sun",
  "swift",
  "tangerine",
  "teal",
  "thistle",
  "tide",
  "timber",
  "topaz",
  "trail",
  "tulip",
  "valley",
  "velvet",
  "violet",
  "wave",
  "west",
  "willow",
  "wind",
  "winter",
  "wren",
  "yarrow",
  "yellow",
  "zinnia",
  "alder",
  "alpine",
  "anise",
  "aqua",
  "aspen",
  "aurora",
  "bay",
  "beam",
  "bluff",
  "bramble",
  "bronze",
  "bubble",
  "canary",
  "cascade",
  "chestnut",
  "cinnamon",
  "cliff",
  "copper",
  "cotton",
  "creek",
  "crystal",
  "dahlia",
  "denim",
  "echo",
  "elm",
  "falcon",
  "feather",
  "fig",
  "firefly",
  "flint",
  "fog",
  "glow",
  "harvest",
  "hawthorn",
  "heather",
  "horizon",
  "ice",
  "jasmine",
  "lagoon",
  "lavender",
  "light",
  "magnolia",
  "mango",
  "marine",
  "morning",
  "mountain",
  "night",
  "nutmeg",
  "oak",
  "orchard",
  "pinecone",
  "rainbow",
  "reed",
  "ridge",
  "sequoia",
  "shadow",
  "sienna",
  "silk",
  "summit",
  "sunset",
  "thyme",
  "whisper",
  "wildflower",
] as const;

function secureRandomIndex(max: number) {
  const range = 0x1_0000_0000;
  const limit = range - (range % max);
  const value = new Uint32Array(1);

  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);

  return value[0] % max;
}

const POLL_SLUG_SECRET_BYTES = 8;
const BASE64_URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

type PollSlugRandomness = {
  randomIndex?: (max: number) => number;
  randomBytes?: (length: number) => Uint8Array;
};

function secureRandomBytes(length: number) {
  const value = new Uint8Array(length);
  crypto.getRandomValues(value);
  return value;
}

function encodeBase64Url(value: Uint8Array) {
  let accumulator = 0;
  let bitCount = 0;
  let encoded = "";

  for (const byte of value) {
    accumulator = (accumulator << 8) | byte;
    bitCount += 8;

    while (bitCount >= 6) {
      bitCount -= 6;
      encoded += BASE64_URL_ALPHABET[(accumulator >> bitCount) & 0x3f];
    }
  }

  if (bitCount > 0) {
    encoded += BASE64_URL_ALPHABET[(accumulator << (6 - bitCount)) & 0x3f];
  }

  return encoded;
}

export function createPollSlug({
  randomIndex = secureRandomIndex,
  randomBytes = secureRandomBytes,
}: PollSlugRandomness = {}) {
  const indexes = new Set<number>();

  while (indexes.size < 3) {
    indexes.add(randomIndex(POLL_SLUG_WORDS.length));
  }

  const secret = randomBytes(POLL_SLUG_SECRET_BYTES);
  if (secret.length !== POLL_SLUG_SECRET_BYTES) {
    throw new Error(
      `Poll slug randomness must provide ${POLL_SLUG_SECRET_BYTES} bytes.`,
    );
  }

  return [
    ...[...indexes].map((index) => POLL_SLUG_WORDS[index]),
    encodeBase64Url(secret),
  ].join("-");
}

export function isPollSlug(value: string) {
  return /^[a-z]+-[a-z]+-[a-z]+(?:-[A-Za-z0-9_-]{11})?$/.test(value);
}
