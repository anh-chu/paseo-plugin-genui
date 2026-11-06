import React from "react";
import type { PluginTheme } from "@getpaseo/plugin";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compile } from "../shared/core";
import { LiveUi } from "./live-ui";
import { MarkdownText } from "./markdown";
import type { UiRuntime } from "./runtime";

const host = vi.hoisted(() => ({
  openLink: vi.fn(async (_url: string) => {}),
  error: vi.fn(),
  capture: vi.fn<(runtime: UiRuntime) => void>(),
}));
vi.mock("@getpaseo/plugin/client", () => ({ useOpenLink: () => host.openLink }));
vi.mock("@getpaseo/plugin/client/ui", () => ({ useToast: () => ({ error: host.error }) }));
vi.mock("@getpaseo/plugin/client/react-native", () => ({
  useToast: () => ({ error: host.error }),
  Icon: () => null,
}));
vi.mock("react-native", () => ({
  Text: "text",
  View: "view",
  Pressable: "button",
  StyleSheet: { hairlineWidth: 1 },
}));
vi.mock("./loaders", () => ({}));
vi.mock("./render", async () => {
  const { useUiRuntime } = await import("./runtime");
  return {
    RenderNodes: () => {
      host.capture(useUiRuntime());
      return null;
    },
  };
});
vi.mock("./web", () => ({ readStorage: () => null, writeStorage: () => {} }));

const theme: PluginTheme = {
  colors: {
    surface0: "white",
    surface1: "white",
    surface2: "white",
    border: "gray",
    foreground: "black",
    foregroundMuted: "gray",
    accent: "blue",
    accentForeground: "white",
    statusSuccess: "green",
    statusWarning: "orange",
    statusDanger: "red",
  },
};
const mounted: ReactTestRenderer[] = [];
async function mount(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(element);
  });
  mounted.push(renderer);
  return renderer;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host.openLink.mockReset().mockResolvedValue();
  host.error.mockClear();
});
afterEach(async () => {
  await act(async () => {
    for (const renderer of mounted.splice(0)) renderer.unmount();
  });
});

describe("preference-aware links", () => {
  it("sends Markdown and bare links to the host preference-aware opener", async () => {
    const renderer = await mount(
      <MarkdownText
        text="[Docs](https://example.com/docs) https://example.com/bare"
        theme={theme}
      />,
    );
    const links = renderer.root.findAllByProps({ accessibilityRole: "link" });
    expect(links).toHaveLength(2);
    await act(async () => {
      for (const link of links) await link.props.onPress();
    });
    expect(host.openLink.mock.calls).toEqual([
      ["https://example.com/docs"],
      ["https://example.com/bare"],
    ]);
  });

  it("reports a failed Markdown opener through the host toast", async () => {
    host.openLink.mockRejectedValueOnce(new Error("Browser unavailable"));
    const renderer = await mount(<MarkdownText text="[Docs](https://example.com)" theme={theme} />);
    await act(async () => {
      await renderer.root.findByProps({ accessibilityRole: "link" }).props.onPress();
    });
    expect(host.error).toHaveBeenCalledWith("Browser unavailable");
  });

  it("dispatches OpenUrl actions through the host opener and reports failures", async () => {
    const compiled = compile('Button("Open", OpenUrl("https://example.com/action"))');
    expect(compiled.diagnostics).toEqual([]);
    await mount(
      <LiveUi
        program={compiled.program!}
        compileDiagnostics={[]}
        source=""
        stateKey="test-links"
        send={async () => {}}
        openFile={null}
        loadImage={null}
        readText={null}
        loadAudio={null}
        playAudio={null}
        agentId={null}
        blockKey={null}
        theme={theme}
        compact={false}
        platform="web"
      />,
    );
    const runtime = host.capture.mock.lastCall![0];
    await act(async () => {
      await runtime.run([{ type: "openUrl", url: "https://example.com/action" }]);
    });
    expect(host.openLink).toHaveBeenCalledExactlyOnceWith("https://example.com/action");
    host.openLink.mockRejectedValueOnce(new Error("Action browser unavailable"));
    await act(async () => {
      await runtime.run([{ type: "openUrl", url: "https://example.com/action" }]);
    });
    expect(host.error).toHaveBeenCalledWith("Action browser unavailable");
  });
});
