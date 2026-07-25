import type { NsfwCategory } from "@35mm/types";

const CATEGORY_PATTERNS: ReadonlyArray<{
  category: NsfwCategory;
  patterns: RegExp[];
}> = [
  {
    category: "nudity",
    patterns: [
      /\b(?:nude|nudity|naked|topless|full[- ]frontal)\b/i,
      /\b(?:bare breasts?|genitals?)\b/i,
    ],
  },
  {
    category: "sexual_content",
    patterns: [
      /\b(?:sex scene|sexual content|sexually explicit|porn(?:ography|ographic)?|erotic)\b/i,
      /\b(?:intercourse|masturbat(?:e|ion|ing))\b/i,
    ],
  },
  {
    category: "violence",
    patterns: [
      /\b(?:graphic violence|violent assault|torture|murder|stabbing|shooting)\b/i,
      /\b(?:domestic violence|sexual violence)\b/i,
    ],
  },
  {
    category: "graphic_content",
    patterns: [
      /\b(?:gore|gory|graphic injury|dismember(?:ment|ed)|decapitat(?:ion|ed))\b/i,
      /\b(?:blood-soaked|mutilat(?:ion|ed))\b/i,
    ],
  },
  {
    category: "sensitive",
    patterns: [
      /\b(?:self[- ]harm|suicide|eating disorder|abuse|trauma)\b/i,
      /\b(?:flashing lights?|photosensitive|disturbing imagery)\b/i,
    ],
  },
];

export function detectNsfwTextHint(text: string): NsfwCategory[] {
  const normalized = text.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return [];

  return CATEGORY_PATTERNS.filter(function (entry) {
    return entry.patterns.some(function (pattern) {
      return pattern.test(normalized);
    });
  }).map(function (entry) {
    return entry.category;
  });
}
