import React, { Component, type ComponentType, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ComponentName } from "../shared/core/catalog";
import type { UiNode } from "../shared/core/types";
import { text, type Props } from "../shared/logic/values";
import { useUiRuntime } from "./runtime";

export interface GroupedButton {
  readonly key: string;
  readonly props: Props;
  readonly element: ReactNode;
}

let renderersMap: Record<ComponentName, ComponentType<{ props: Props }>> | null = null;
let buttonGroupComponent: ComponentType<{ buttons: readonly GroupedButton[] }> | null = null;

export function registerRenderers(
  map: Record<ComponentName, ComponentType<{ props: Props }>>,
  buttonGroup: ComponentType<{ buttons: readonly GroupedButton[] }>,
): void {
  renderersMap = map;
  buttonGroupComponent = buttonGroup;
}

export function ErrorLine({ message }: { message: string }) {
  const { theme } = useUiRuntime();
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.statusDanger,
        backgroundColor: theme.colors.surface1,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text selectable style={{ color: theme.colors.statusDanger, fontSize: 12 }}>
        {message}
      </Text>
    </View>
  );
}

export function LoadingPlaceholder({
  path,
  component,
}: {
  path: string;
  component: string | null;
}) {
  const { theme } = useUiRuntime();
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
        {component ? `Loading ${component} (${path})…` : `Loading ${path}…`}
      </Text>
    </View>
  );
}

export function RenderNode({ node }: { node: UiNode }): ReactNode {
  if (node.type === "Error") return <ErrorLine message={text(node.props.message)} />;
  if (node.type === "Loading") {
    return (
      <LoadingPlaceholder
        path={text(node.props.path)}
        component={typeof node.props.component === "string" ? node.props.component : null}
      />
    );
  }
  if (!renderersMap) return null;
  const Renderer = renderersMap[node.type];
  return <Renderer props={node.props} />;
}

export function RenderNodes({
  nodes,
  isolate = false,
}: {
  nodes: readonly UiNode[];
  isolate?: boolean;
}): ReactNode {
  const seen = new Set<string>();
  const out: ReactNode[] = [];
  let run: GroupedButton[] | null = null;
  const Group = buttonGroupComponent;

  nodes.forEach((node, index) => {
    const key = seen.has(node.key) ? `${node.key}@${index}` : node.key;
    seen.add(node.key);
    const element = isolate ? (
      <NodeBoundary key={key} node={node}>
        <RenderNode node={node} />
      </NodeBoundary>
    ) : (
      <RenderNode key={key} node={node} />
    );

    if (node.type !== "Button" || !Group) {
      run = null;
      out.push(element);
    } else if (run === null) {
      const buttons: GroupedButton[] = [{ key, props: node.props, element }];
      run = buttons;
      out.push(<Group key={`buttons:${key}`} buttons={buttons} />);
    } else {
      run.push({ key, props: node.props, element });
    }
  });

  return <>{out}</>;
}

interface BoundaryProps {
  node: UiNode;
  children: ReactNode;
}

export class NodeBoundary extends Component<BoundaryProps, { error: string | null }> {
  override state: { error: string | null } = { error: null };

  static getDerivedStateFromError(cause: unknown): { error: string } {
    return { error: cause instanceof Error ? cause.message : String(cause) };
  }

  override componentDidUpdate(previous: BoundaryProps): void {
    if (this.state.error !== null && previous.node !== this.props.node) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    return this.state.error === null ? (
      this.props.children
    ) : (
      <ErrorLine message={this.state.error} />
    );
  }
}
