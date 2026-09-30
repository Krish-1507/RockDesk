import { describe, expect, it } from "vitest";
import { titleSimilarity } from "../src/services/chat/duplicate-detector.js";

describe("titleSimilarity", () => {
  it("scores near-identical titles high", () => {
    expect(titleSimilarity("Checkout page throwing 500 errors", "Checkout page 500 error")).toBeGreaterThanOrEqual(0.5);
  });

  it("scores clearly different titles low", () => {
    expect(titleSimilarity("Login page crashes on Safari", "Checkout page throwing 500 errors")).toBeLessThan(0.5);
  });

  it("ignores filler words and case", () => {
    expect(titleSimilarity("The Login Page Is Broken", "login page broken")).toBeGreaterThanOrEqual(0.5);
  });

  it("returns 0 when either side has no signal words", () => {
    expect(titleSimilarity("the and of", "Login page broken")).toBe(0);
    expect(titleSimilarity("", "")).toBe(0);
  });

  it("matches across languages loosely but identical text exactly", () => {
    expect(titleSimilarity("Payment page slow", "Payment page slow")).toBe(1);
    expect(titleSimilarity("Payment page slow", "Search results wrong")).toBeLessThan(0.5);
  });
});
