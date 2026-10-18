import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

/**
 * A fullscreen image viewer, like the one Paseo uses for chat images. The plugin
 * SDK exposes no call to open the host's, so this is built on React Native's Modal,
 * which covers the whole window. Click the image to switch between fit and actual size.
 */
export function ImageLightbox({
  uri,
  title,
  onClose,
}: {
  uri: string;
  title: string;
  onClose(): void;
}) {
  const viewport = useWindowDimensions();
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [actual, setActual] = useState(false);

  useEffect(() => {
    let live = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (live) setNatural({ width, height });
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [uri]);

  const stageWidth = viewport.width;
  const stageHeight = Math.max(200, viewport.height - 96);
  const fit = natural === null ? 1 : Math.min(stageWidth / natural.width, stageHeight / natural.height, 1);
  const scale = actual ? 1 : fit;
  const shown = natural === null ? null : { width: natural.width * scale, height: natural.height * scale };
  const zoomable = natural !== null && fit < 1;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
            {natural !== null ? `   ${natural.width} × ${natural.height}` : ""}
          </Text>
          {natural !== null ? <Text style={styles.percent}>{Math.round(scale * 100)}%</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.stage}
          contentContainerStyle={{ minHeight: stageHeight, minWidth: stageWidth, alignItems: "center", justifyContent: "center" }}
          horizontal={actual}
          maximumZoomScale={4}
          centerContent
        >
          <ScrollView
            contentContainerStyle={{ minHeight: stageHeight, justifyContent: "center", alignItems: "center" }}
            scrollEnabled={actual}
          >
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={zoomable ? (actual ? "Fit to window" : "Show actual size") : title}
              onPress={() => {
                if (zoomable) setActual((value) => !value);
              }}
            >
              {shown !== null ? (
                <Image source={{ uri }} resizeMode="contain" style={shown} />
              ) : (
                <Text style={styles.percent}>Loading…</Text>
              )}
            </Pressable>
          </ScrollView>
        </ScrollView>
        <Text style={styles.hint}>
          {zoomable ? (actual ? "Click to fit" : "Click to zoom") : ""}
          {Platform.OS === "web" ? `${zoomable ? " · " : ""}Esc to close` : ""}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { flex: 1, color: "#f4f4f5", fontSize: 13, fontWeight: "600" },
  percent: { color: "#a1a1aa", fontSize: 12 },
  close: { padding: 6 },
  closeText: { color: "#f4f4f5", fontSize: 16 },
  stage: { flex: 1 },
  hint: { color: "#a1a1aa", fontSize: 12, textAlign: "center", paddingVertical: 8 },
});
