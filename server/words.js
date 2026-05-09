
const words = {
  easy: [
    "sun", "cat", "dog", "hat", "tree", "fish", "ball", "star", "moon",
    "car", "cup", "bed", "egg", "cake", "book", "door", "rain", "snow",
    "bird", "frog", "shoe", "lamp", "boat", "bell", "kite", "apple",
    "house", "heart", "smile", "cloud", "pizza", "chair", "mouse",
    "phone", "clock", "spoon", "brush", "water", "grass", "bread",
    "candy", "paint", "watch", "beach", "music", "train", "crown",
    "horse", "plane", "truck", "glass", "table", "shirt", "dress",
    "wheel", "piano", "knife", "teeth", "snake", "river", "bride",
    "angel", "ghost", "witch", "sword", "arrow", "flame", "robot",
    "donut", "mango", "grape", "lemon", "onion", "panda", "tiger",
  ],

  medium: [
    "rainbow", "bicycle", "hammock", "compass", "volcano", "lantern",
    "penguin", "dolphin", "popcorn", "cactus", "rocket", "trophy",
    "anchor", "candle", "jigsaw", "teapot", "pirate", "wizard",
    "cowboy", "dragon", "monkey", "parrot", "turtle", "rabbit",
    "hockey", "boxing", "soccer", "tennis", "skiing", "surfing",
    "camera", "laptop", "helmet", "pillow", "basket", "garden",
    "sunset", "island", "bridge", "castle", "tunnel", "museum",
    "jungle", "desert", "forest", "canyon", "glacier", "tornado",
    "battery", "blanket", "chimney", "curtain", "diamond", "earring",
    "feather", "glasses", "igloo", "jewelry", "kitchen", "library",
    "mailbox", "napkin", "octopus", "peacock", "quarter", "rainbow",
    "sausage", "toaster", "unicorn", "village", "whistle", "xylophone",
  ],

  hard: [
    "astronomy", "blueprint", "chameleon", "dandelion", "ecosystem",
    "fireworks", "gladiator", "harmonica", "invisible", "jellyfish",
    "kaleidoscope", "labyrinth", "marshmallow", "nightmare", "orchestra",
    "parachute", "quicksand", "raspberry", "saxophone", "telescope",
    "umbrella", "ventriloquist", "waterfall", "chandelier", "boomerang",
    "trampoline", "scarecrow", "snowflake", "thunderstorm", "earthquake",
    "skyscraper", "astronaut", "butterfly", "crocodile", "dragonfly",
    "electricity", "flamingo", "grasshopper", "helicopter", "kangaroo",
    "lighthouse", "microphone", "porcupine", "submarine", "wheelchair",
    "caterpillar", "blacksmith", "constellation", "handkerchief",
    "slingshot", "thunderbolt", "tightrope", "treasure chest",
    "disco ball", "roller coaster", "hot air balloon", "solar system",
  ],
};

export function pickRandomWords(count = 3) {
  const difficulties = ["easy", "medium", "hard"];
  const picks = [];

  for (let i = 0; i < count; i++) {
    const diff = difficulties[i % difficulties.length];
    const list = words[diff];
    const word = list[Math.floor(Math.random() * list.length)];
    picks.push({ word, difficulty: diff });
  }

  return picks;
}

export default words;
