import { describe, expect, it } from "vitest";
import {
  collectLoads,
  compile,
  compileStreaming,
  dataKey,
  evaluate,
  initialState,
} from "./core";
import { COMPONENTS, type ComponentName } from "./core/catalog";
import { checkSpec, findFences, renderReplyMarkdown } from "./fallback";
import {
  AGENT_INSTRUCTIONS,
  CODE_WORK_INSTRUCTIONS,
  UI_REFERENCE,
  UI_REFERENCE_MORE,
} from "./instructions";
import { splitTimelineMessage } from "./segment";
import { listGallery, loadGalleryFile, readGallerySpec } from "../server/data-source";

describe("paseo-plugin-genui core, instructions, and gallery", () => {
  it("compiles every example in the agent instructions cleanly", () => {
    for (const section of [
      UI_REFERENCE,
      UI_REFERENCE_MORE,
      CODE_WORK_INSTRUCTIONS,
      AGENT_INSTRUCTIONS,
    ]) {
      const fences = findFences(section.split("\n")).filter((f) => f.language === "ui");
      for (const fence of fences) {
        const compiled = compile(fence.body);
        expect(compiled.diagnostics, fence.body).toEqual([]);
        expect(compiled.program).not.toBeNull();
      }
    }
  });

  it("covers all 86 catalog components in the gallery and compiles + evaluates every gallery spec", async () => {
    const files = await listGallery();
    expect(files.length).toBeGreaterThanOrEqual(170);

    const covered = new Set<string>();
    for (const file of files) {
      const comp = file.replace(/\.ui$/, "").split("-")[0]!;
      covered.add(comp);

      const source = await readGallerySpec(file);
      const compiled = compile(source);
      expect(compiled.diagnostics, `${file} compile diagnostics`).toEqual([]);
      expect(compiled.program, `${file} program`).not.toBeNull();

      const requests = collectLoads(compiled.program!);
      const loadedPairs = await Promise.all(
        requests.map(async (req) => [dataKey(req), await loadGalleryFile(req.path, req)] as const),
      );
      for (const [key, res] of loadedPairs) {
        expect(res.ok, `${file} load ${key}`).toBe(true);
      }
      const data = new Map(loadedPairs);
      const state = initialState(compiled.program!, data);
      const evaluated = evaluate(compiled.program!, state, data);
      expect(evaluated.diagnostics, `${file} evaluate diagnostics`).toEqual([]);
      expect(evaluated.roots.length, `${file} roots`).toBeGreaterThan(0);
    }

    for (const name of Object.keys(COMPONENTS) as ComponentName[]) {
      expect(covered.has(name), `Gallery example for ${name}`).toBe(true);
    }
  });

  it("splits assistant messages into prose and streaming/complete ui and app blocks", () => {
    const plain = "Hello world\n```ts\nconst x = 1;\n```";
    expect(splitTimelineMessage(plain, "complete")).toBeUndefined();

    const streaming = "Here is your estimate:\n```ui\n$seats = 10\nCard(\"Estimate\", [Metric(\"Seats\", $seats)])";
    const splitStream = splitTimelineMessage(streaming, "streaming", "msg_1");
    expect(splitStream?.items).toHaveLength(2);
    expect(splitStream?.items[0]).toMatchObject({
      kind: "genui-text",
      data: { text: "Here is your estimate:", phase: "streaming" },
    });
    expect(splitStream?.items[1]).toMatchObject({
      kind: "genui-block",
      data: {
        language: "ui",
        complete: false,
        fenceIndex: 0,
        messageId: "msg_1",
      },
    });

    const streamCompile = compileStreaming("$seats = 10\nCard(\"Estimate\", [Metric(\"Seats\", $seats");
    expect(streamCompile.program).not.toBeNull();
  });

  it("renders replies containing ui and app blocks to plain markdown", async () => {
    const reply = [
      "Summary sentence.",
      "```ui",
      'Card("Metrics", [Metric("Latency", "14 ms")])',
      "```",
      "```app",
      "<!doctype html><title>Pendulum</title><canvas></canvas>",
      "```",
    ].join("\n");

    const md = await renderReplyMarkdown(reply, (req) => loadGalleryFile(req.path, req));
    expect(md).toContain("Summary sentence.");
    expect(md).toContain("Latency");
    expect(md).toContain("14 ms");
    expect(md).toContain("Interactive app: Pendulum");
  });

  it("validates specs with checkSpec", async () => {
    const valid = await checkSpec(
      'Card("Test", [Metric("Users", "42")])',
      (req) => loadGalleryFile(req.path, req),
    );
    expect(valid.ok).toBe(true);
    expect(valid.report).toContain("No errors.");
  });
});
