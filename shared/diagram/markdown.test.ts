import { describe, expect, it } from "vitest";
import { parseInline } from "./markdown";

describe("parseInline links", () => {
  it("reads a Markdown link", () => {
    expect(parseInline("see [the docs](https://paseo.sh/docs) now")).toEqual([
      { kind: "text", text: "see " },
      { kind: "link", text: "the docs", url: "https://paseo.sh/docs" },
      { kind: "text", text: " now" },
    ]);
  });

  it("links a bare URL without its trailing punctuation", () => {
    expect(parseInline("go to https://paseo.sh/a_b_c.")).toEqual([
      { kind: "text", text: "go to " },
      { kind: "link", text: "https://paseo.sh/a_b_c", url: "https://paseo.sh/a_b_c" },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves a URL inside code alone", () => {
    expect(parseInline("`https://paseo.sh`")).toEqual([{ kind: "code", text: "https://paseo.sh" }]);
  });

  it("shows a link with an unsafe scheme as its text", () => {
    expect(parseInline("[x](javascript:void)")).toEqual([{ kind: "text", text: "x" }]);
  });
});
