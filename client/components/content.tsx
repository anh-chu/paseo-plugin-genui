import { Icon as PaseoIcon, Modal } from "@getpaseo/plugin/client/react-native";
import { ExternalLink } from "@getpaseo/plugin/client/ui";
import React, { useContext, useEffect, useState } from "react";
import { Image as RNImage, Pressable, StyleSheet, Text as RNText, View } from "react-native";
import { keyValuePairs } from "../../shared/logic/content-model";
import { parseListRows } from "../../shared/logic/explain-logic";
import { resolveIconName } from "../../shared/logic/icons";
import { entityKind, imageRef, inlineFacts, sourceLinks } from "../../shared/logic/references-model";
import { finiteNumber, isNode, list, optionalText, text, tone, type Props } from "../../shared/logic/values";
import { MarkdownText } from "../markdown";
import { ErrorLine, RenderNode } from "../node-renderer";
import { InTableContext, toneColor, toneMutedColor, useUiRuntime, type ImageUrl } from "../runtime";

export function Text({ props }: { props: Props }) {
  const { theme, compact } = useUiRuntime();
  const content = text(props.text);
  const t = tone(props.tone);
  const color = t === "neutral" ? theme.colors.foreground : toneColor(theme, t);
  return <MarkdownText text={content} theme={theme} compact={compact} color={color} />;
}

export function Callout({ props }: { props: Props }) {
  const { theme, compact } = useUiRuntime();
  const body = text(props.text);
  const title = optionalText(props.title);
  const t = tone(props.tone);
  const borderColor = t === "neutral" ? theme.colors.border : toneColor(theme, t);

  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor,
        borderLeftWidth: 3,
        borderLeftColor: borderColor,
        backgroundColor: theme.colors.surface2,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 4,
      }}
    >
      {title ? (
        <RNText style={{ color: toneColor(theme, t), fontSize: 13, fontWeight: "600" }}>
          {title}
        </RNText>
      ) : null}
      <MarkdownText text={body} theme={theme} compact={compact} />
    </View>
  );
}

export function Metric({ props }: { props: Props }) {
  const { theme } = useUiRuntime();
  const label = text(props.label);
  const value = text(props.value);
  const note = optionalText(props.note);
  const t = tone(props.tone);

  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface2,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 2,
      }}
    >
      <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 11.5 }}>{label}</RNText>
      <RNText
        selectable
        style={{
          color: toneColor(theme, t),
          fontSize: 20,
          fontWeight: "700",
        }}
      >
        {value}
      </RNText>
      {note ? (
        <RNText style={{ color: toneMutedColor(theme, t), fontSize: 11.5 }}>{note}</RNText>
      ) : null}
    </View>
  );
}

export function Badge({ props }: { props: Props }) {
  const { theme } = useUiRuntime();
  const inTable = useContext(InTableContext);
  const label = text(props.text);
  const t = tone(props.tone);
  const color = t === "neutral" ? theme.colors.foregroundMuted : toneColor(theme, t);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: inTable ? 6 : 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: theme.colors.surface2,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t === "neutral" ? theme.colors.border : color,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <RNText style={{ color, fontSize: 11.5, fontWeight: "500" }}>{label}</RNText>
    </View>
  );
}

export function Icon({ props }: { props: Props }) {
  const { theme } = useUiRuntime();
  const rawName = text(props.name);
  const resolved = resolveIconName(rawName) ?? rawName;
  const t = tone(props.tone);
  return <PaseoIcon name={resolved} size={16} color={toneColor(theme, t)} />;
}

export function KeyValue({ props }: { props: Props }) {
  const { theme } = useUiRuntime();
  const pairs = keyValuePairs(props.pairs);
  if (pairs === null) return <ErrorLine message="KeyValue expects an object or [[key, value]] list" />;

  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        overflow: "hidden",
      }}
    >
      {pairs.map(([k, v], idx) => (
        <View
          key={`${k}:${idx}`}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
          }}
        >
          <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 12.5, flexShrink: 0 }}>
            {k}
          </RNText>
          {isNode(v) ? (
            <RenderNode node={v} />
          ) : (
            <RNText
              selectable
              style={{ color: theme.colors.foreground, fontSize: 12.5, flex: 1, textAlign: "right" }}
            >
              {text(v)}
            </RNText>
          )}
        </View>
      ))}
    </View>
  );
}

export function LoadedImageView({
  src,
  alt,
  height = 200,
  zoomable = true,
}: {
  src: string;
  alt?: string | null;
  height?: number;
  /** Tapping opens the image full size; off where the image sits inside another tap target. */
  zoomable?: boolean;
}) {
  const { theme, loadImage } = useUiRuntime();
  const [state, setState] = useState<ImageUrl | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!loadImage || !src) return;
    let live = true;
    void loadImage(src).then((res) => {
      if (live) setState(res);
    });
    return () => {
      live = false;
    };
  }, [loadImage, src]);

  if (!src) return <ErrorLine message="Image src is empty" />;
  if (state === null) {
    return (
      <View
        style={{
          height,
          borderRadius: 8,
          backgroundColor: theme.colors.surface2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>Loading image…</RNText>
      </View>
    );
  }
  if (!state.ok) {
    return (
      <View
        style={{
          borderRadius: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface2,
          padding: 10,
        }}
      >
        <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
          {state.error} ({src})
        </RNText>
      </View>
    );
  }

  const picture = (frameHeight: number) => (
    <RNImage
      source={{ uri: state.url }}
      accessibilityLabel={alt ?? src}
      resizeMode="contain"
      style={{
        width: "100%",
        height: frameHeight,
        borderRadius: 8,
        backgroundColor: theme.colors.surface2,
      }}
    />
  );

  return (
    <View style={{ gap: 4 }}>
      {zoomable ? (
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={`View ${alt ?? src} full size`} onPress={() => setZoomed(true)}>
          {picture(height)}
        </Pressable>
      ) : (
        picture(height)
      )}
      {alt ? (
        <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 11.5 }}>{alt}</RNText>
      ) : null}
      {zoomed ? (
        <Modal title={alt ?? src} open={zoomed} onOpenChange={setZoomed}>
          <Modal.Content>{picture(520)}</Modal.Content>
        </Modal>
      ) : null}
    </View>
  );
}

export function Image({ props }: { props: Props }) {
  const src = text(props.src);
  const alt = optionalText(props.alt);
  return <LoadedImageView src={src} alt={alt} height={220} />;
}

export function File({ props }: { props: Props }) {
  const { theme, openFile } = useUiRuntime();
  const filePath = text(props.path);
  const line = finiteNumber(props.line);
  const label = line !== null ? `${filePath}:${Math.round(line)}` : filePath;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (openFile) void openFile(filePath, line ?? undefined);
      }}
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: theme.colors.surface2,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
      }}
    >
      <PaseoIcon name="FileText" size={13} color={theme.colors.accent} />
      <RNText selectable style={{ color: theme.colors.foreground, fontFamily: "monospace", fontSize: 12 }}>
        {label}
      </RNText>
    </Pressable>
  );
}

export function Entity({ props }: { props: Props }) {
  const { theme } = useUiRuntime();
  const [open, setOpen] = useState(false);
  const name = text(props.name);
  const kind = entityKind(props.kind);
  const note = optionalText(props.note);
  const url = optionalText(props.url);
  const imgRef = imageRef(text(props.image));
  const rawPairs = keyValuePairs(props.facts) ?? [];
  const previewFacts = inlineFacts(rawPairs, 4);

  return (
    <View
      style={{
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface2,
        padding: 12,
        gap: 8,
      }}
    >
      {imgRef.kind === "load" ? <LoadedImageView src={imgRef.src} alt={name} height={140} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <RNText selectable style={{ color: theme.colors.foreground, fontSize: 14, fontWeight: "600", flex: 1 }}>
          {name}
        </RNText>
        <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 11, textTransform: "uppercase" }}>
          {kind}
        </RNText>
      </View>
      {note ? <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 12.5 }}>{note}</RNText> : null}
      {previewFacts.length > 0 ? (
        <View style={{ gap: 4 }}>
          {previewFacts.map((fact, idx) => (
            <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>{fact.label}</RNText>
              <RNText selectable style={{ color: theme.colors.foreground, fontSize: 12, fontWeight: "500" }}>
                {fact.value}
              </RNText>
            </View>
          ))}
          {rawPairs.length > 4 ? (
            <Pressable onPress={() => setOpen(true)}>
              <RNText style={{ color: theme.colors.accent, fontSize: 12 }}>
                View all {rawPairs.length} facts
              </RNText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {url && /^https?:\/\//i.test(url) ? (
        <ExternalLink href={url}>
          <RNText style={{ color: theme.colors.accent, fontSize: 12 }}>{url}</RNText>
        </ExternalLink>
      ) : null}
      {open ? (
        <Modal title={name} open={open} onOpenChange={setOpen}>
          <Modal.Content>
            <View style={{ gap: 8 }}>
              {rawPairs.map(([label, val], idx) => (
                <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>{label}</RNText>
                  <RNText selectable style={{ color: theme.colors.foreground, fontSize: 13 }}>
                    {text(val)}
                  </RNText>
                </View>
              ))}
            </View>
          </Modal.Content>
        </Modal>
      ) : null}
    </View>
  );
}

export function Sources({ props }: { props: Props }) {
  const { theme } = useUiRuntime();
  const links = sourceLinks(list(props.links));

  return (
    <View style={{ gap: 6 }}>
      {links.map((item, idx) =>
        item.ok ? (
          <View
            key={`${item.href}:${idx}`}
            style={{
              borderRadius: 8,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface2,
              paddingHorizontal: 10,
              paddingVertical: 8,
              gap: 2,
            }}
          >
            <ExternalLink href={item.href}>
              <RNText style={{ color: theme.colors.accent, fontSize: 13, fontWeight: "500" }}>
                [{item.number}] {item.title}
              </RNText>
            </ExternalLink>
            <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 11 }}>{item.domain}</RNText>
            {item.note ? (
              <RNText style={{ color: theme.colors.foreground, fontSize: 12 }}>{item.note}</RNText>
            ) : null}
          </View>
        ) : (
          <ErrorLine key={idx} message={item.error} />
        ),
      )}
    </View>
  );
}

export function List({ props }: { props: Props }) {
  const { theme, run } = useUiRuntime();
  const rows = parseListRows(props.items);

  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        overflow: "hidden",
      }}
    >
      {rows.map((item, idx) => {
        const iconName = item.icon ? resolveIconName(item.icon) ?? item.icon : null;
        const t = item.tone ?? "neutral";
        const rowContent = (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              {iconName ? (
                <PaseoIcon name={iconName} size={15} color={toneColor(theme, t)} />
              ) : null}
              <View style={{ flex: 1, gap: 2 }}>
                <RNText style={{ color: theme.colors.foreground, fontSize: 13, fontWeight: "500" }}>
                  {item.title}
                </RNText>
                {item.detail ? (
                  <RNText style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
                    {item.detail}
                  </RNText>
                ) : null}
              </View>
            </View>
            {item.value !== null ? (
              isNode(item.value) ? (
                <RenderNode node={item.value} />
              ) : (
                <RNText style={{ color: toneColor(theme, t), fontSize: 12.5, fontWeight: "500" }}>
                  {text(item.value)}
                </RNText>
              )
            ) : null}
          </View>
        );
        return item.actions.length > 0 ? (
          <Pressable key={idx} accessibilityRole="button" onPress={() => void run(item.actions)}>
            {rowContent}
          </Pressable>
        ) : (
          <View key={idx}>{rowContent}</View>
        );
      })}
    </View>
  );
}
