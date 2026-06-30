import type { ImageGuideInput } from "../../lib/images/types";

const gameStyles: Record<string, string> = {
  "elden-ring":
    "Dark fantasy game key art, monumental ruined architecture, weathered medieval materials, muted gold accents, dangerous open-world atmosphere",
  "honkai-star-rail":
    "Polished science-fantasy game key art, futuristic technology, expressive anime-inspired characters, luminous cosmic environment",
  "the-legend-of-zelda-tears-of-the-kingdom":
    "Painterly high-fantasy adventure art, ancient sky ruins, natural landscapes, handcrafted technology, bright exploratory mood"
};

const compositions = [
  "low-angle cinematic composition with a strong central silhouette",
  "wide environmental composition with the subject placed on the left third",
  "dynamic three-quarter view with layered foreground depth",
  "high vantage point revealing the route and surrounding landscape",
  "close hero composition with a readable background landmark"
];

const lightingOptions = [
  "dramatic golden-hour light through mist",
  "cold moonlight with a restrained magical glow",
  "storm light breaking through heavy clouds",
  "warm firelight against a deep blue environment",
  "soft dawn light with long atmospheric shadows"
];

const environmentDetails = [
  "wind-blown cloth and drifting ash",
  "ancient stone markers and distant ruins",
  "subtle magical particles and layered fog",
  "weathered equipment and traces of a recent battle",
  "a winding path leading toward a distant objective"
];

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function humanize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function subjectForGuide(guide: ImageGuideInput) {
  const topic = `${guide.keyword} ${guide.title}`.toLowerCase();

  if (topic.includes("strength")) {
    return "a huge armored warrior carrying an ultra greatsword, heavy golden armor, immense physical power";
  }
  if (topic.includes("faith")) {
    return "a holy knight casting radiant golden magic inside an ancient temple";
  }
  if (/\bdex\b|\bdexterity\b/.test(topic)) {
    return "a fast assassin wielding a katana under moonlight, agile stance and flowing cloak";
  }
  if (/\bbleed\b|\bblood\b/.test(topic)) {
    return "a swift blood-themed warrior with paired blades, crimson energy cutting through the air";
  }
  if (/\bintelligence\b|\bmagic\b|\bmage\b/.test(topic)) {
    return "a scholarly battle mage channeling blue celestial magic among arcane ruins";
  }
  if (/\bboss\b/.test(topic) || guide.category === "boss-guide") {
    return "an epic towering boss before a dark castle, dense fog and powerful magic filling the arena";
  }
  if (/\brune\b|\bfarming\b/.test(topic)) {
    return "glowing golden runes scattered across a vast open-world landscape and a profitable travel route";
  }
  if (/\bweapon\b|\bweapons\b/.test(topic)) {
    return "a practical collection of early weapons arranged beside an adventurer preparing to depart";
  }
  if (guide.category === "map-guide") {
    return "a detailed world map, marked travel route, distant landmarks and a broad landscape";
  }
  if (guide.category === "beginner-guide") {
    return "a new player learning the tutorial near a campfire, basic equipment and a clear path forward";
  }
  if (guide.category === "walkthrough") {
    return "an adventurer progressing through a dangerous location toward the next objective";
  }
  if (guide.category === "quest-guide") {
    return "a player meeting a mysterious NPC during an important magical dialogue scene";
  }
  if (guide.category === "tier-list") {
    return "a varied roster of heroes presented as a balanced strategic lineup without labels or rankings";
  }

  return "a player character demonstrating the guide's core strategy in a readable gameplay-inspired scene";
}

export function buildImagePrompt(guide: ImageGuideInput) {
  const hash = stableHash(guide.slug);
  const style =
    gameStyles[guide.game] ||
    "Premium cinematic game key art, detailed environment, readable action and grounded fantasy lighting";
  const composition = compositions[hash % compositions.length];
  const lighting = lightingOptions[Math.floor(hash / 7) % lightingOptions.length];
  const detail =
    environmentDetails[Math.floor(hash / 17) % environmentDetails.length];
  const topic = humanize(guide.keyword);
  const difficulty = humanize(guide.difficulty).toLowerCase();

  return [
    style + ".",
    `Subject: ${subjectForGuide(guide)}.`,
    `Editorial focus: visually communicate ${topic} for a ${difficulty} player.`,
    `Composition: ${composition}, ${lighting}, ${detail}.`,
    "Wide 16:9 featured image, one clear focal point, rich environmental detail, suitable for a game guide card.",
    "No text, letters, captions, logos, borders, watermarks, interface elements, or split-screen layout."
  ].join(" ");
}
