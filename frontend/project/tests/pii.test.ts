// Unit tests for the FLYYY.AI PII detection + sanitization logic.
// Run with: npm test
//
// These tests mirror the logic used in the edge functions. We duplicate the
// core algorithm here (not import the edge function) because edge functions
// run in Deno and are not importable from Node. The algorithm is intentionally
// simple and deterministic so the tests are meaningful.

import { describe, it, expect } from "./deps.ts";

type PiiType = "EMAIL" | "PHONE" | "NAME" | "ADDRESS" | "SSN" | "CREDIT_CARD";
interface PiiMatch { type: PiiType; value: string; start: number; end: number; }

const NAME_LIST = ["Ramesh","Suresh","John","Jane","Robert","Emily","Michael","Sarah","David","Linda","James","Maria","Richard","Patricia","Charles","Jennifer","Thomas","Elizabeth","Daniel","Susan","Aisha","Wei","Yuki","Carlos","Priya","Amit","Kumar","Anita","Raj","Meena","Arjun","Divya"];
const PATTERNS: { type: PiiType; re: RegExp }[] = [
  { type: "EMAIL", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "CREDIT_CARD", re: /\b(?:\d[ -]*?){13,19}\b/g },
  { type: "PHONE", re: /(?<!\d)(\+?\d[\d\s\-().]{7,}\d)(?!\d)/g },
  { type: "ADDRESS", re: /\b\d{1,6}\s+[A-Z][a-zA-Z]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court)\b\.?/g },
];

function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (type === "CREDIT_CARD" && m[0].replace(/\D/g, "").length < 13) continue;
      matches.push({ type, value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  for (const name of NAME_LIST) {
    const re = new RegExp(`\\b${name}\\b`, "gi");
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ type: "NAME", value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const result: PiiMatch[] = [];
  let lastEnd = -1;
  for (const m of matches) { if (m.start >= lastEnd) { result.push(m); lastEnd = m.end; } }
  return result;
}

function sanitize(text: string): { sanitized: string; matches: PiiMatch[] } {
  const matches = detectPii(text);
  let out = ""; let cursor = 0;
  for (const m of matches) { out += text.slice(cursor, m.start); out += `<${m.type}>`; cursor = m.end; }
  out += text.slice(cursor);
  return { sanitized: out, matches };
}

function piiCounts(matches: PiiMatch[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const m of matches) c[m.type] = (c[m.type] ?? 0) + 1;
  return c;
}

describe("PII detection", () => {
  it("detects a name from the curated list", () => {
    const { matches } = sanitize("Write a reminder to Ramesh.");
    expect(matches.some((m) => m.type === "NAME" && m.value === "Ramesh")).toBe(true);
  });

  it("detects a phone number", () => {
    const { matches } = sanitize("Call 9840123456 now.");
    expect(matches.some((m) => m.type === "PHONE")).toBe(true);
  });

  it("detects an email address", () => {
    const { matches } = sanitize("Contact jane@example.com please.");
    expect(matches.some((m) => m.type === "EMAIL" && m.value === "jane@example.com")).toBe(true);
  });

  it("detects an address", () => {
    const { matches } = sanitize("Ship to 123 Main St please.");
    expect(matches.some((m) => m.type === "ADDRESS")).toBe(true);
  });

  it("detects an SSN", () => {
    const { matches } = sanitize("SSN is 123-45-6789.");
    expect(matches.some((m) => m.type === "SSN")).toBe(true);
  });

  it("returns no matches for a clean prompt", () => {
    const { matches } = sanitize("What is the status of my order?");
    expect(matches.length).toBe(0);
  });
});

describe("PII sanitization", () => {
  it("replaces name and phone with tokens", () => {
    const { sanitized } = sanitize("Write a reminder email to Ramesh, phone 9840123456.");
    expect(sanitized).toBe("Write a reminder email to <NAME>, phone <PHONE>.");
  });

  it("replaces name and phone in the insurance example", () => {
    const { sanitized } = sanitize("Call Ramesh at 9840123456 about his insurance claim.");
    expect(sanitized).toBe("Call <NAME> at <PHONE> about his insurance claim.");
  });

  it("replaces email with token", () => {
    const { sanitized } = sanitize("Email jane@example.com about the return.");
    expect(sanitized).toContain("<EMAIL>");
    expect(sanitized).not.toContain("jane@example.com");
  });

  it("replaces address with token", () => {
    const { sanitized } = sanitize("Deliver to 123 Main St tomorrow.");
    expect(sanitized).toContain("<ADDRESS>");
    expect(sanitized).not.toContain("123 Main St");
  });

  it("handles multiple PII types in one prompt", () => {
    const { sanitized, matches } = sanitize("Email jane@example.com about John at 555-123-4567, 123 Main St.");
    expect(sanitized).not.toContain("jane@example.com");
    expect(sanitized).not.toContain("John");
    expect(sanitized).not.toContain("555-123-4567");
    expect(sanitized).not.toContain("123 Main St");
    const types = matches.map((m) => m.type);
    expect(types).toContain("EMAIL");
    expect(types).toContain("NAME");
    expect(types).toContain("PHONE");
    expect(types).toContain("ADDRESS");
  });

  it("does not alter a clean prompt", () => {
    const { sanitized } = sanitize("What is your return policy?");
    expect(sanitized).toBe("What is your return policy?");
  });
});

describe("PII counts", () => {
  it("counts PII types correctly", () => {
    const { matches } = sanitize("Call Ramesh at 9840123456 about his insurance claim.");
    const counts = piiCounts(matches);
    expect(counts.NAME).toBe(1);
    expect(counts.PHONE).toBe(1);
  });

  it("counts multiple occurrences of the same type", () => {
    const { matches } = sanitize("Ramesh called Ramesh again.");
    const counts = piiCounts(matches);
    expect(counts.NAME).toBe(2);
  });

  it("returns empty object for no PII", () => {
    const { matches } = sanitize("Hello there.");
    const counts = piiCounts(matches);
    expect(Object.keys(counts).length).toBe(0);
  });
});

describe("Privacy guarantee — raw values never in sanitized output", () => {
  it("never contains the original phone digits", () => {
    const phone = "9840123456";
    const { sanitized } = sanitize(`Call ${phone} now.`);
    expect(sanitized).not.toContain(phone);
  });

  it("never contains the original email", () => {
    const email = "sensitive.user@company.org";
    const { sanitized } = sanitize(`Reach me at ${email}.`);
    expect(sanitized).not.toContain(email);
  });

  it("never contains the original SSN", () => {
    const ssn = "123-45-6789";
    const { sanitized } = sanitize(`My SSN is ${ssn}.`);
    expect(sanitized).not.toContain(ssn);
  });
});
