// Instant, offline answer check used by Speed Q&A and scripted roleplay.
// A keyword set is a list of groups; the answer must hit every group, and a
// group is hit when any one of its alternatives appears as a whole word/phrase.
// "*" is a wildcard inside a word: "friend*" matches "friends", "*ing" matches "cooking".

export type KeywordGroups = string[][];

function normalize(text: string, keep: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(new RegExp(`[^a-z0-9'${keep}\\s]`, "g"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, unify apostrophes, drop punctuation, collapse spaces. */
export function normalizeAnswer(text: string): string {
  return normalize(text, "");
}

function alternativePattern(alternative: string): RegExp {
  // Same normalisation as answers, but the "*" wildcard must survive it.
  const words = normalize(alternative, "*")
    .split(" ")
    .map((word) => word.replace(/\*/g, "[a-z0-9']*"));
  return new RegExp(`(?:^| )${words.join(" ")}(?= |$)`);
}

export function matchesKeywords(answer: string, groups: KeywordGroups): boolean {
  const normalized = normalizeAnswer(answer);
  return groups.every((group) => group.some((alt) => alternativePattern(alt).test(normalized)));
}
