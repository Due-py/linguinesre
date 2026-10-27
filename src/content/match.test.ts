import { describe, expect, it } from "vitest";
import { matchesKeywords, normalizeAnswer } from "./match";

describe("normalizeAnswer", () => {
  it("lowercases, unifies apostrophes and drops punctuation", () => {
    expect(normalizeAnswer("  I’d LOVE to,   thanks!! ")).toBe("i'd love to thanks");
  });
});

describe("matchesKeywords", () => {
  it("needs every group to be hit", () => {
    const groups = [["like", "love"], ["*ing"]];
    expect(matchesKeywords("I love cooking.", groups)).toBe(true);
    expect(matchesKeywords("I love football.", groups)).toBe(false);
  });

  it("matches whole words only", () => {
    expect(matchesKeywords("I am unlikely to go", [["like"]])).toBe(false);
    expect(matchesKeywords("I like it", [["like"]])).toBe(true);
  });

  it("matches multi-word phrases", () => {
    expect(matchesKeywords("At the weekend, after school", [["after school"]])).toBe(true);
    expect(matchesKeywords("after the school", [["after school"]])).toBe(false);
  });

  it("supports a wildcard inside a word", () => {
    expect(matchesKeywords("with my friends", [["friend*"]])).toBe(true);
    expect(matchesKeywords("I prefer swimming", [["*ing"]])).toBe(true);
  });

  it("handles contractions typed with a curly apostrophe", () => {
    expect(matchesKeywords("I’d love to", [["i'd"]])).toBe(true);
    expect(matchesKeywords("Sorry, I can’t.", [["can't"]])).toBe(true);
  });
});
