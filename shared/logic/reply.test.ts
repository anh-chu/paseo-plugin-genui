import { describe, expect, it } from "vitest";
import { compile, evaluate } from "../core";
import { acceptDraftEdit, commentText, composeReply, draftScope, draftText, editText, hasOwnNumber, resolveDraftEdit } from "./reply";

describe("reply", () => {
  it("joins queued items before the final message and drops blanks", () => {
    expect(composeReply(["Fix all", "  ", "On step 3 (Checks): use nudge"], "Go ahead with the plan.")).toBe(
      "Fix all\n\nOn step 3 (Checks): use nudge\n\nGo ahead with the plan.",
    );
    expect(composeReply([], "Go")).toBe("Go");
    expect(composeReply(["Only queued"], null)).toBe("Only queued");
  });

  it("writes comments and edits, and skips empty ones", () => {
    expect(commentText("step 2 (Spec)", "  split it ")).toBe("On step 2 (Spec): split it");
    expect(commentText("step 2 (Spec)", " ")).toBeNull();
    expect(editText("step 2", { title: "Spec", detail: "One migration" }, { title: "Spec v2", detail: "One migration" })).toBe(
      'Edit step 2: title "Spec" → "Spec v2"',
    );
    expect(editText("step 2", { title: "Spec" }, { title: "Spec " })).toBeNull();
  });

  it("detects titles that carry their own number", () => {
    expect(hasOwnNumber("1. Spec + shared schema")).toBe(true);
    expect(hasOwnNumber("2a. Needs you")).toBe(true);
    expect(hasOwnNumber("3) Release")).toBe(true);
    expect(hasOwnNumber("2026 roadmap")).toBe(false);
    expect(hasOwnNumber("Spec")).toBe(false);
  });
});

describe("draftText", () => {
  it("is null when the draft is unchanged", () => {
    expect(draftText("Issue", "Body\n", "Body")).toBeNull();
  });
  it("carries the edited text", () => {
    expect(draftText("Issue", "Body", "New body\n")).toBe('Use this edited version of the draft "Issue":\n\nNew body');
    expect(draftText(null, "Body", "New")).toBe("Use this edited version of the draft:\n\nNew");
  });
});

describe("Draft edit state", () => {
  it("gives distinct Draft instances distinct scopes even with identical Markdown", () => {
    const compiled = compile('Stack([Draft("Same", "One"), Draft("Same", "Two")])');
    expect(compiled.program).not.toBeNull();
    const { roots } = evaluate(compiled.program!, {});
    const stack = roots[0]!;
    const children = stack.props.children as readonly { key: string }[];
    expect(children).toHaveLength(2);
    expect(draftScope(children[0]!.key)).not.toBe(draftScope(children[1]!.key));
    expect(draftScope(children[0]!.key)).toBe(draftScope(children[0]!.key));
  });

  it("validates stored edits and drops edits whose original text changed", () => {
    const saved = acceptDraftEdit({ original: "Old body", edited: "Edited body" });
    expect(saved).toEqual({ original: "Old body", edited: "Edited body" });
    expect(resolveDraftEdit(saved, "Old body")).toBe("Edited body");
    expect(resolveDraftEdit(saved, "New body")).toBeNull();
    expect(resolveDraftEdit(null, "Old body")).toBeNull();

    expect(acceptDraftEdit("legacy plain string")).toBeNull();
    expect(acceptDraftEdit(null)).toBeNull();
    expect(acceptDraftEdit({ original: "Only original" })).toBeNull();
    expect(acceptDraftEdit(["Original", "Edited"])).toBeNull();
  });
});
