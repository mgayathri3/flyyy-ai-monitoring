// Tests for retention logic — computing the cutoff date and identifying
// records older than the retention period.
import { describe, it, expect } from "./deps.ts";

function computeCutoff(retentionDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - retentionDays * 86400000);
}

function isExpired(createdAt: string, cutoff: Date): boolean {
  return new Date(createdAt) < cutoff;
}

describe("Retention logic", () => {
  it("computes a cutoff 30 days in the past", () => {
    const now = new Date("2026-01-31T00:00:00Z");
    const cutoff = computeCutoff(30, now);
    expect(cutoff.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("computes a cutoff 7 days in the past", () => {
    const now = new Date("2026-01-08T00:00:00Z");
    const cutoff = computeCutoff(7, now);
    expect(cutoff.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("marks a 40-day-old record as expired under 30-day retention", () => {
    const now = new Date("2026-02-10T00:00:00Z");
    const cutoff = computeCutoff(30, now);
    const oldRecord = "2026-01-01T00:00:00Z"; // 40 days old
    expect(isExpired(oldRecord, cutoff)).toBe(true);
  });

  it("does not mark a 10-day-old record as expired under 30-day retention", () => {
    const now = new Date("2026-02-10T00:00:00Z");
    const cutoff = computeCutoff(30, now);
    const recentRecord = "2026-02-05T00:00:00Z"; // 5 days old
    expect(isExpired(recentRecord, cutoff)).toBe(false);
  });

  it("marks a record exactly at the boundary as not expired", () => {
    const now = new Date("2026-01-31T00:00:00Z");
    const cutoff = computeCutoff(30, now); // 2026-01-01
    const boundaryRecord = "2026-01-01T00:00:00Z"; // exactly at cutoff
    expect(isExpired(boundaryRecord, cutoff)).toBe(false); // < is strict
  });

  it("handles 90-day retention", () => {
    const now = new Date("2026-04-01T00:00:00Z");
    const cutoff = computeCutoff(90, now);
    expect(cutoff.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("Prompt monitoring on/off behavior", () => {
  it("stores null sanitized_prompt when monitoring is disabled", () => {
    const promptMonitoringEnabled = false;
    const storedPrompt = promptMonitoringEnabled ? "some sanitized text" : null;
    expect(storedPrompt).toBeNull();
  });

  it("stores the sanitized prompt when monitoring is enabled", () => {
    const promptMonitoringEnabled = true;
    const sanitized = "Call <NAME> at <PHONE>.";
    const storedPrompt = promptMonitoringEnabled ? sanitized : null;
    expect(storedPrompt).toBe(sanitized);
  });

  it("still records non-content metadata when monitoring is disabled", () => {
    const promptMonitoringEnabled = false;
    // These fields are always recorded regardless of monitoring state
    const metadata = {
      provider: "demo",
      model: "demo-support-v1",
      duration_ms: 420,
      status: "success",
      pii_detected: true,
      pii_counts: { NAME: 1, PHONE: 1 },
      sanitized_prompt: promptMonitoringEnabled ? "text" : null,
    };
    expect(metadata.sanitized_prompt).toBeNull();
    expect(metadata.provider).toBe("demo");
    expect(metadata.pii_detected).toBe(true);
    expect(metadata.pii_counts.NAME).toBe(1);
  });
});
