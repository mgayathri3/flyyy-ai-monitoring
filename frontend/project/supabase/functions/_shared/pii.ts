// PII detection + sanitization library (shared by edge functions).
//
// Detection approach: regex-based pattern matching for common PII types plus a
// small curated list of common given names. This is intentionally dependency-free
// so it runs in the Deno edge runtime without external packages.
//
// Supported PII types:
//  - EMAIL    — RFC-ish email addresses
//  - PHONE    — international/US/India-style phone numbers (digits, spaces, dashes, +)
//  - NAME     — common given names from a curated list (case-insensitive, word-boundary)
//  - ADDRESS  — street addresses (e.g. "123 Main St")
//  - SSN      — US Social Security Number pattern xxx-xx-xxxx
//  - CREDIT_CARD — 13-19 digit grouped card numbers
//
// Strengths: deterministic, fast, no external API, no data leaves the runtime.
// Limitations:
//  - NAME detection has false positives (common words that are also names) and
//    false negatives (names not in the list). This is a fundamental limitation
//    of regex/name-list approaches; production systems should use an NER model
//    (e.g. Presidio) or LLM-based extraction. See README for details.
//  - PHONE may match long numeric runs that are not phone numbers.
//  - ADDRESS heuristic is coarse.
//  - Detection is English-oriented.

export type PiiType = "EMAIL" | "PHONE" | "NAME" | "ADDRESS" | "SSN" | "CREDIT_CARD";

export interface PiiMatch {
  type: PiiType;
  value: string;
  start: number;
  end: number;
}

const NAME_LIST = [
  "Ramesh", "Suresh", "John", "Jane", "Robert", "Emily", "Michael", "Sarah",
  "David", "Linda", "James", "Maria", "Richard", "Patricia", "Charles", "Jennifer",
  "Thomas", "Elizabeth", "Daniel", "Susan", "Aisha", "Wei", "Yuki", "Carlos",
  "Priya", "Amit", "Kumar", "Anita", "Raj", "Meena", "Arjun", "Divya",
];

const PATTERNS: { type: PiiType; re: RegExp }[] = [
  { type: "EMAIL", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "CREDIT_CARD", re: /\b(?:\d[ -]*?){13,19}\b/g },
  { type: "PHONE", re: /(?<!\d)(\+?\d[\d\s\-().]{7,}\d)(?!\d)/g },
  { type: "ADDRESS", re: /\b\d{1,6}\s+[A-Z][a-zA-Z]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court)\b\.?/g },
];

export function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // skip credit-card-looking runs that are clearly phone numbers already matched
      if (type === "CREDIT_CARD" && m[0].replace(/\D/g, "").length < 13) continue;
      matches.push({ type, value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  // name detection (word-boundary, case-insensitive)
  for (const name of NAME_LIST) {
    const re = new RegExp(`\\b${name}\\b`, "gi");
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ type: "NAME", value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  // de-duplicate overlapping matches, preferring more specific types
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const result: PiiMatch[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      result.push(m);
      lastEnd = m.end;
    }
  }
  return result;
}

export function sanitize(text: string): { sanitized: string; matches: PiiMatch[] } {
  const matches = detectPii(text);
  let out = "";
  let cursor = 0;
  for (const m of matches) {
    out += text.slice(cursor, m.start);
    out += `<${m.type}>`;
    cursor = m.end;
  }
  out += text.slice(cursor);
  return { sanitized: out, matches };
}

export function piiCounts(matches: PiiMatch[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of matches) {
    counts[m.type] = (counts[m.type] ?? 0) + 1;
  }
  return counts;
}
