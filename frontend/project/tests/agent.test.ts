// Integration tests for declared-vs-observed data-source comparison logic.
// These mirror the logic in the flyyy-agent edge function.
import { describe, it, expect } from "./deps.ts";

function findUnexpected(declared: string[], observed: string[]): string[] {
  return observed.filter((o) => !declared.includes(o));
}

describe("Declared vs observed comparison", () => {
  it("returns empty when observed equals declared", () => {
    expect(findUnexpected(["FAQ Database"], ["FAQ Database"])).toEqual([]);
  });

  it("returns empty when observed is a subset of declared", () => {
    expect(findUnexpected(["FAQ Database", "Orders Database"], ["FAQ Database"])).toEqual([]);
  });

  it("flags the unexpected source", () => {
    expect(findUnexpected(["FAQ Database"], ["FAQ Database", "Orders Database"])).toEqual(["Orders Database"]);
  });

  it("flags multiple unexpected sources", () => {
    expect(findUnexpected(["FAQ Database"], ["FAQ Database", "Orders Database", "Billing Database"]))
      .toEqual(["Orders Database", "Billing Database"]);
  });

  it("flags everything when nothing was declared", () => {
    expect(findUnexpected([], ["FAQ Database"])).toEqual(["FAQ Database"]);
  });

  it("is case-sensitive (deliberate — source names are canonical)", () => {
    expect(findUnexpected(["FAQ Database"], ["faq database"])).toEqual(["faq database"]);
  });
});

describe("Agent run scenarios", () => {
  it("Scenario A (expected access): no violation", () => {
    const declared = ["FAQ Database"];
    const observed = ["FAQ Database"];
    const unexpected = findUnexpected(declared, observed);
    expect(unexpected.length).toBe(0);
  });

  it("Scenario B (unexpected access): Orders Database flagged", () => {
    const declared = ["FAQ Database"];
    const observed = ["FAQ Database", "Orders Database"];
    const unexpected = findUnexpected(declared, observed);
    expect(unexpected).toEqual(["Orders Database"]);
    expect(unexpected.length).toBe(1);
  });
});
