import { describe, expect, it } from "vitest";
import { checkSpec } from "./fallback";

const noLoad = async () => ({ ok: false as const, error: "no loads in this test" });

describe("Chart series shapes", () => {
  it("accepts {name: {values, tone}} as the catalog documents", async () => {
    const spec = `Chart("bar", ["a", "b"], {Billed: {values: [1, 2], tone: "warn"}, Other: [3, 4]}, stacked: true)`;
    const result = await checkSpec(spec, noLoad as never);
    expect(result.report).toMatch(/^No errors/);
    expect(result.ok).toBe(true);
  });
  it("still rejects a list of lists", async () => {
    const result = await checkSpec(`Chart("bar", ["a"], [[1]])`, noLoad as never);
    expect(result.ok).toBe(false);
  });
});
