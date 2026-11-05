import type { PluginTimelineItem } from "@getpaseo/plugin";
import { findFences } from "./fallback";

export const GENUI_BLOCK_KIND = "genui-block";
export const GENUI_TEXT_KIND = "genui-text";

export type MessageSegment =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "fence";
      readonly language: "ui" | "app";
      readonly code: string;
      readonly complete: boolean;
      readonly fenceIndex: number;
    };

export function segmentMessage(text: string, phase: "streaming" | "complete"): MessageSegment[] {
  const lines = text.split("\n");
  const allFences = findFences(lines);
  const uiFences = allFences.filter((fence) => fence.language === "ui" || fence.language === "app");
  if (uiFences.length === 0) return [{ kind: "text", text }];

  const segments: MessageSegment[] = [];
  let cursor = 0;
  let fenceIndex = 0;
  for (const fence of uiFences) {
    if (fence.open > cursor) {
      const prose = lines.slice(cursor, fence.open).join("\n").trim();
      if (prose !== "") segments.push({ kind: "text", text: prose });
    }
    const language = fence.language === "app" ? "app" : "ui";
    segments.push({
      kind: "fence",
      language,
      code: fence.body,
      complete: fence.closed,
      fenceIndex: fenceIndex++,
    });
    cursor = fence.close + 1;
  }
  if (cursor < lines.length) {
    const tail = lines.slice(cursor).join("\n").trim();
    if (tail !== "") segments.push({ kind: "text", text: tail });
  }
  return segments;
}

export function splitTimelineMessage(
  text: string,
  phase: "streaming" | "complete",
  messageId?: string,
): { items: PluginTimelineItem[] } | undefined {
  const segments = segmentMessage(text, phase);
  if (!segments.some((segment) => segment.kind === "fence")) return undefined;

  const items: PluginTimelineItem[] = [];
  segments.forEach((segment) => {
    if (segment.kind === "fence") {
      items.push({
        type: "plugin",
        kind: GENUI_BLOCK_KIND,
        version: 1,
        data: {
          language: segment.language,
          code: segment.code,
          complete: segment.complete,
          fenceIndex: segment.fenceIndex,
          ...(messageId ? { messageId } : {}),
        },
      });
    } else {
      items.push(...splitTaskDirectives(segment.text, phase));
    }
  });
  return { items };
}

// ponytail: Paseo applies only the first transformer that claims a message, so
// once genui claims it the tasks plugin never sees its ::task{key="ABC-12"}
// lines. We emit the tasks plugin's card (kind "tasks-card", version 1, key
// rule TASK_KEY_PATTERN) and set pluginId so Paseo draws it with the tasks
// renderer; pluginId needs Paseo with getpaseo/paseo discussion #8822 shipped.
// It breaks silently if the tasks card format changes. Remove this when Paseo
// chains transformers over plugin output.
const TASK_DIRECTIVE_LINE = /^::task\{([^}]*)\}\s*$/;
const TASK_KEY = /^[A-Za-z][A-Za-z0-9]{0,9}-\d+$/;

function splitTaskDirectives(
  text: string,
  phase: "streaming" | "complete",
): Array<PluginTimelineItem & { pluginId?: string }> {
  const items: Array<PluginTimelineItem & { pluginId?: string }> = [];
  let prose: string[] = [];
  const flushProse = () => {
    const chunk = prose.join("\n").trim();
    if (chunk !== "") items.push({ type: "plugin", kind: GENUI_TEXT_KIND, version: 1, data: { text: chunk, phase } });
    prose = [];
  };
  for (const line of text.split("\n")) {
    const match = TASK_DIRECTIVE_LINE.exec(line.trim());
    if (!match) {
      prose.push(line);
      continue;
    }
    flushProse();
    const attrs = match[1] ?? "";
    const key = (/\bkey\s*=\s*"([^"]*)"/.exec(attrs)?.[1] ?? "").trim();
    const title = (/\btitle\s*=\s*"([^"]*)"/.exec(attrs)?.[1] ?? "").trim();
    const valid = TASK_KEY.test(key);
    items.push({
      type: "plugin",
      kind: "tasks-card",
      version: 1,
      pluginId: "tasks",
      data: { taskKey: valid ? key.toUpperCase() : key, fallbackTitle: title || null, valid, phase },
    });
  }
  flushProse();
  return items;
}
