import { describe, expect, it } from "vitest";
import type { UiNode } from "../core/types";
import { computeTableLayout, parseTableColumns, resolveRowCells, stripInlineMarkdown } from "./tableLayout";

function badge(label: string): UiNode {
  return { kind: "node", type: "Badge", key: `b:${label}`, props: { text: label, tone: "good" } };
}

describe("tableLayout", () => {
  it("strips inline markdown delimiters for width measurement", () => {
    expect(stripInlineMarkdown("Header (`SCHEDULE`)")).toBe("Header (SCHEDULE)");
    expect(stripInlineMarkdown("See [docs](https://example.com) and **bold**")).toBe("See docs and bold");
    expect(stripInlineMarkdown("snake_case_name")).toBe("snake_case_name");
  });

  it("allocates short columns tightly and gives prose columns the remaining width without scrolling", () => {
    const cols = parseTableColumns(["Slot", "What it shows", "Click"]);
    const rows = [
      [
        "Header (`SCHEDULE`)",
        "Click anywhere on the header to collapse/expand (persisted per device). When collapsed, folds into 1 live ticker line (`▸ SCHEDULE · Now: Weekly design sync...` or `Next: ...`).",
        "Toggle",
      ],
      [
        "`PREV` (previous call)",
        "Most recent ended call today, subtly muted with `✓` when after-call follow-through is done or a chat icon if its prep/follow-up thread exists.",
        "Open chat",
      ],
      [
        "`NOW` / `LIVE` (current)",
        "Highlighted card right between Previous and Next with time range, live captions count (when matched), and 1-tap `Call chat` / `Dossier` / `Join` chips.",
        "Open call",
      ],
      [
        "Next 4 + `View all`",
        "Notion-style 1-line rows with colored squares (work/personal/attention), `RSVP` / `📎` / `Prep` flags, and compact times (`1:30–2:30 PM`, `Mon 10 AM`). `… View all` expands the rest of the 7-day window.",
        "Open event",
      ],
    ];

    const layout = computeTableLayout(cols, rows, 880, false);
    expect(layout.scroll).toBe(false);
    expect(layout.totalWidth).toBe(880);
    expect(layout.widths.reduce((a, b) => a + b, 0)).toBe(880);
    // Short columns should stay compact while the prose column gets > 55% of the table.
    expect(layout.widths[0]).toBeLessThan(210);
    expect(layout.widths[2]).toBeLessThan(130);
    expect(layout.widths[1]).toBeGreaterThan(540);

    // On compact screens, short multi-word columns wrap so the prose column stays readable without scrolling.
    const compactLayout = computeTableLayout(cols, rows, 328, true);
    expect(compactLayout.scroll).toBe(false);
    expect(compactLayout.widths.reduce((a, b) => a + b, 0)).toBe(328);
    expect(compactLayout.widths[1]).toBeGreaterThanOrEqual(155);
  });

  it("fills the full container proportionally when all columns fit on one line", () => {
    const cols = parseTableColumns(["Option", "Cost", "Cold start", "Notes"]);
    const rows = [
      ["Workers", "$5/mo", badge("~0 ms"), "One deploy for assets and API"],
      ["Pages", "Free", badge("n/a"), "Static only"],
      ["VPS", "$6/mo", badge("none"), "You patch the OS"],
    ];

    const layout = computeTableLayout(cols, rows, 800, false);
    expect(layout.scroll).toBe(false);
    expect(layout.widths.reduce((a, b) => a + b, 0)).toBe(800);
    expect(layout.widths[3]).toBeGreaterThan(layout.widths[1]!);
  });

  it("enables horizontal scrolling with capped prose widths only when columns exceed available width", () => {
    const cols = parseTableColumns(["Project", "Requests", "Cache Hit", "P50", "P95", "Errors", "Notes"]);
    const rows = [
      [
        "web-storefront",
        "12.4M",
        "94.2%",
        "18ms",
        "92ms",
        "0.01%",
        "Very long description explaining why cache hit dropped during the Tuesday afternoon deployment window and what was reverted afterward.",
      ],
    ];

    const desktop = computeTableLayout(cols, rows, 880, false);
    expect(desktop.scroll).toBe(false);
    expect(desktop.widths.reduce((a, b) => a + b, 0)).toBe(880);

    const mobile = computeTableLayout(cols, rows, 340, true);
    expect(mobile.scroll).toBe(true);
    expect(mobile.totalWidth).toBe(mobile.widths.reduce((a, b) => a + b, 0));
    // Prose column is capped so scrolling stays bounded.
    expect(mobile.widths[6]).toBeLessThanOrEqual(240);
  });

  it("resolves object rows by column key or label and respects explicit width", () => {
    const cols = parseTableColumns([
      { key: "id", label: "ID", width: 70 },
      { key: "desc", label: "Description" },
    ]);
    const row = resolveRowCells({ id: "A-1", desc: "A long description that wraps cleanly" }, cols);
    expect(row).toEqual(["A-1", "A long description that wraps cleanly"]);

    const layout = computeTableLayout(cols, [row], 600, false);
    expect(layout.scroll).toBe(false);
    expect(layout.widths[0]).toBe(70);
    expect(layout.widths[1]).toBe(530);
  });
});
