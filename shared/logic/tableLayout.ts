import type { UiNode, Value } from "../core/types";
import { asRecord, finiteNumber, isNode, list, text } from "./values";

const CELL_PAD_X = 20; // paddingHorizontal: 10 * 2
const HEADER_CHAR_PX = 7.4; // 12px semibold
const CELL_CHAR_PX = 7.6; // 12.5px regular + inline code buffer
const ABS_MIN_COL = 56;
const SHORT_TEXT_CHARS = 16;
const PROSE_TEXT_CHARS = 50;

export interface TableColumnDef {
  readonly key: string;
  readonly label: string;
  readonly fixedWidth: number | null;
}

export interface TableLayout {
  /** Computed pixel widths per column. When `scroll` is false, sums to the available width and doubles as proportional flex weights. */
  readonly widths: readonly number[];
  /** Minimum readable width per column. */
  readonly minWidths: readonly number[];
  /** Total pixel width of the table. */
  readonly totalWidth: number;
  /** True only when columns cannot fit cleanly in the container width and horizontal scrolling is needed. */
  readonly scroll: boolean;
}

export function parseTableColumns(rawColumns: readonly Value[]): TableColumnDef[] {
  return rawColumns.map((col) => {
    const rec = asRecord(col);
    if (!rec) {
      const label = text(col);
      return { key: label, label, fixedWidth: null };
    }
    const label = text(rec.label ?? rec.key);
    const key = text(rec.key ?? rec.label);
    const w = finiteNumber(rec.width);
    return {
      key,
      label,
      fixedWidth: w !== null && w > 0 ? Math.round(w) : null,
    };
  });
}

export function resolveRowCells(row: Value, columns: readonly TableColumnDef[]): readonly Value[] {
  if (Array.isArray(row)) return row;
  const rec = asRecord(row);
  if (rec) return columns.map((col) => rec[col.key] ?? rec[col.label] ?? null);
  return [row];
}

/** Strips inline Markdown delimiters so width estimates reflect rendered characters. */
export function stripInlineMarkdown(raw: string): string {
  return raw
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^A-Za-z0-9])\*([^*\n]+)\*(?![A-Za-z0-9])/g, "$1$2");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function measurePlainText(raw: string, compact: boolean): { fit: number; min: number } {
  const clean = stripInlineMarkdown(raw).trim();
  if (clean.length === 0) return { fit: 0, min: 0 };

  const lines = clean.split("\n");
  let maxLine = 0;
  for (const line of lines) {
    if (line.length > maxLine) maxLine = line.length;
  }

  const fit = Math.ceil(maxLine * CELL_CHAR_PX) + CELL_PAD_X;
  const words = clean.split(/\s+/).filter(Boolean);
  let longestWord = 0;
  for (const word of words) {
    if (word.length > longestWord) longestWord = word.length;
  }

  if (maxLine <= SHORT_TEXT_CHARS) {
    if (compact && words.length > 1) {
      const wordMin = Math.ceil(longestWord * CELL_CHAR_PX) + CELL_PAD_X;
      return { fit, min: Math.min(fit, Math.max(ABS_MIN_COL, wordMin)) };
    }
    return { fit, min: fit };
  }

  const wordMin = Math.ceil(Math.min(longestWord, SHORT_TEXT_CHARS) * CELL_CHAR_PX) + CELL_PAD_X;
  const floor = maxLine > PROSE_TEXT_CHARS ? (compact ? 155 : 155) : compact ? 76 : 96;
  return { fit, min: Math.max(wordMin, floor) };
}

function measureNode(node: UiNode, compact: boolean): { fit: number; min: number } {
  switch (node.type) {
    case "Badge": {
      const len = text(node.props.text).length;
      const fit = Math.ceil(len * 6.8) + 26 + CELL_PAD_X;
      return { fit, min: clamp(fit, ABS_MIN_COL, 130) };
    }
    case "Button": {
      const len = text(node.props.label).length;
      const iconExtra = node.props.icon ? 18 : 0;
      const fit = Math.ceil(len * 7.2) + 28 + iconExtra + CELL_PAD_X;
      return { fit, min: clamp(fit, 64, 140) };
    }
    case "Icon":
      return { fit: 44, min: 44 };
    case "Sparkline":
      return { fit: 116, min: 96 };
    case "Progress":
      return { fit: 148, min: 110 };
    case "File": {
      const len = text(node.props.path).length;
      const fit = Math.ceil(len * 7.2) + 24 + CELL_PAD_X;
      return { fit, min: clamp(fit, 80, 140) };
    }
    case "Text":
      return measurePlainText(text(node.props.text), compact);
    case "Row": {
      const children = list(node.props.children).filter(isNode);
      if (children.length === 0) return { fit: 80, min: 64 };
      let sumFit = CELL_PAD_X + Math.max(0, children.length - 1) * 8;
      for (const child of children) {
        sumFit += Math.max(0, measureNode(child, compact).fit - CELL_PAD_X);
      }
      return { fit: sumFit, min: Math.min(sumFit, compact ? 120 : 155) };
    }
    case "Stack": {
      const children = list(node.props.children).filter(isNode);
      if (children.length === 0) return { fit: 80, min: 64 };
      let maxFit = 0;
      for (const child of children) {
        const m = measureNode(child, compact);
        if (m.fit > maxFit) maxFit = m.fit;
      }
      return { fit: maxFit, min: Math.min(maxFit, compact ? 120 : 155) };
    }
    default:
      return { fit: 150, min: 100 };
  }
}

function measureCell(cell: Value | undefined, compact: boolean): { fit: number; min: number } {
  if (cell === undefined || cell === null) return { fit: 0, min: 0 };
  if (isNode(cell)) return measureNode(cell, compact);
  return measurePlainText(text(cell), compact);
}

/**
 * Computes content-aware column widths for a Table:
 * - Short columns get their natural single-line width instead of wasting space.
 * - Long prose columns receive the remaining container width and wrap cleanly.
 * - Horizontal scrolling activates only when the table's minimum readable width
 *   exceeds the container width, with long columns capped so nothing blows out.
 */
export function computeTableLayout(
  columns: readonly TableColumnDef[],
  rows: readonly (readonly Value[])[],
  availableWidth: number,
  compact: boolean,
): TableLayout {
  const count = columns.length;
  if (count === 0) {
    return { widths: [], minWidths: [], totalWidth: 0, scroll: false };
  }

  const effectiveWidth = availableWidth > 0 ? availableWidth : compact ? 340 : 760;
  const maxMinCol = 155;
  const maxHeaderMin = compact ? 84 : 110;
  const maxScrollCol = compact ? 240 : 340;

  const minWidths: number[] = [];
  const fitWidths: number[] = [];

  for (let c = 0; c < count; c++) {
    const col = columns[c]!;
    if (col.fixedWidth !== null) {
      minWidths.push(col.fixedWidth);
      fitWidths.push(col.fixedWidth);
      continue;
    }

    const headerClean = stripInlineMarkdown(col.label).trim();
    const headerFit = Math.ceil(headerClean.length * HEADER_CHAR_PX) + CELL_PAD_X;
    const headerMin = Math.min(headerFit, maxHeaderMin);

    let maxCellFit = 0;
    let maxCellMin = 0;
    for (let r = 0; r < rows.length; r++) {
      const m = measureCell(rows[r]?.[c], compact);
      if (m.fit > maxCellFit) maxCellFit = m.fit;
      if (m.min > maxCellMin) maxCellMin = m.min;
    }

    const minW = clamp(Math.max(headerMin, maxCellMin), ABS_MIN_COL, maxMinCol);
    const fitW = Math.max(minW, headerFit, maxCellFit);
    minWidths.push(minW);
    fitWidths.push(fitW);
  }

  const sumMin = minWidths.reduce((a, b) => a + b, 0);
  const sumFit = fitWidths.reduce((a, b) => a + b, 0);

  // Regime 3: Too many columns to fit cleanly -> horizontal scroll with explicit capped widths.
  if (sumMin > effectiveWidth) {
    const widths = columns.map((col, i) =>
      col.fixedWidth !== null ? col.fixedWidth : Math.round(clamp(fitWidths[i]!, minWidths[i]!, maxScrollCol)),
    );
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    return { widths, minWidths, totalWidth, scroll: true };
  }

  // Regime 1: Every column fits on a single line -> distribute extra width proportionally.
  if (sumFit <= effectiveWidth) {
    const extra = effectiveWidth - sumFit;
    const flexIndices = columns
      .map((col, i) => (col.fixedWidth === null ? i : -1))
      .filter((i) => i >= 0);
    const flexFitSum = flexIndices.reduce((acc, i) => acc + fitWidths[i]!, 0);

    const rawWidths = fitWidths.map((fit, i) => {
      if (columns[i]!.fixedWidth !== null) return fit;
      if (flexIndices.length === 0) return fit;
      const share = flexFitSum > 0 ? fit / flexFitSum : 1 / flexIndices.length;
      return fit + extra * share;
    });
    const widths = roundToTotal(rawWidths, effectiveWidth);
    return { widths, minWidths, totalWidth: effectiveWidth, scroll: false };
  }

  // Regime 2: Mix of short and wrapping columns -> water-fill using sqrt(need) weights
  // so short columns reach their single-line width first and long columns share the rest.
  const widths = [...minWidths];
  let remaining = effectiveWidth - sumMin;

  for (let iter = 0; iter < count && remaining > 0.5; iter++) {
    const active: number[] = [];
    for (let i = 0; i < count; i++) {
      if (fitWidths[i]! - widths[i]! > 0.5) active.push(i);
    }
    if (active.length === 0) break;

    const weights = active.map((i) => Math.sqrt(fitWidths[i]! - widths[i]!));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) break;

    let cappedAny = false;
    for (let k = 0; k < active.length; k++) {
      const idx = active[k]!;
      const share = remaining * (weights[k]! / totalWeight);
      const need = fitWidths[idx]! - widths[idx]!;
      if (share >= need) {
        widths[idx] = fitWidths[idx]!;
        remaining -= need;
        cappedAny = true;
      }
    }

    if (!cappedAny) {
      for (let k = 0; k < active.length; k++) {
        const idx = active[k]!;
        widths[idx] = widths[idx]! + remaining * (weights[k]! / totalWeight);
      }
      remaining = 0;
    }
  }

  const rounded = roundToTotal(widths, effectiveWidth);
  return { widths: rounded, minWidths, totalWidth: effectiveWidth, scroll: false };
}

function roundToTotal(values: readonly number[], targetTotal: number): number[] {
  const rounded = values.map((v) => Math.max(1, Math.round(v)));
  const diff = Math.round(targetTotal) - rounded.reduce((a, b) => a + b, 0);
  if (diff !== 0 && rounded.length > 0) {
    let widest = 0;
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i]! > rounded[widest]!) widest = i;
    }
    rounded[widest] = Math.max(1, rounded[widest]! + diff);
  }
  return rounded;
}
