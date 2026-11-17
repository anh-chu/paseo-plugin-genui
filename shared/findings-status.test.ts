import { describe, expect, it } from "vitest";
import { fixAllMessage, needsFix, readFindings, statusCounts, statusSentence } from "./core/findings";

// Findings shows fix buttons only for findings that still need a fix, and the status of each one.
describe("Findings with statuses", () => {
  const parsed = readFindings([
    { severity: "high", title: "Retry drops the payload", file: "src/queue.ts", line: 88, status: "open" },
    { severity: "medium", title: "Lock never released", file: "src/lock.ts", status: "fixed" },
    { severity: "low", title: "Typo in log line", status: "confirmed" },
    { severity: "low", title: "Rename helper", status: "rejected" },
  ]);
  if (!parsed.ok) throw new Error(parsed.error);
  const { findings, scale } = parsed.report;

  it("offers a fix only for open findings", () => {
    expect(findings.map(needsFix)).toEqual([true, false, false, false]);
  });

  it("Fix all asks only for what is open", () => {
    const msg = fixAllMessage(findings.filter(needsFix), scale);
    expect(msg).toContain("Retry drops the payload");
    expect(msg).not.toContain("Lock never released");
    expect(msg).not.toContain("Typo in log line");
  });

  it("says where each finding stands", () => {
    expect(findings.map((item) => statusSentence(item).split(";")[0])).toEqual([
      "Open",
      "Fixed by its owner",
      "Fix confirmed by the reviewer",
      "Rejected by its owner",
    ]);
    expect(statusCounts(findings).map((c) => c.text)).toEqual(["1 open", "1 fixed, awaiting confirmation", "1 confirmed", "1 rejected"]);
  });

  it("no statuses: no lifecycle line, every finding fixable", () => {
    const plain = readFindings([{ severity: "high", title: "A" }, { severity: "low", title: "B" }]);
    if (!plain.ok) throw new Error(plain.error);
    expect(statusCounts(plain.report.findings)).toEqual([]);
    expect(plain.report.findings.every(needsFix)).toBe(true);
  });
});
