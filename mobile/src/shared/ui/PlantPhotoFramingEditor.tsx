import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Slider from "@react-native-community/slider";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import CenteredSpinner from "./CenteredSpinner";
import { DEFAULT_PHOTO_FRAMING, PHOTO_DETAILS_ASPECT_RATIO, PHOTO_MAX_ZOOM, PHOTO_MIN_ZOOM,
  normalizePhotoFraming, panPhotoFraming, photoImageLayout, zoomPhotoFraming } from "../utils/photoFraming";
import type { PhotoFraming, PhotoSize } from "../utils/photoFraming";

type Props = {
  uri: string; width?: number; height?: number; value: PhotoFraming; onChange: (value: PhotoFraming) => void;
  disabled?: boolean; onInteractionChange?: (active: boolean) => void;
  journalLabel?: string;
};
type Touch = { count: number; pageX: number; pageY: number; x: number; y: number; distance: number };
function touch(event: GestureResponderEvent): Touch | null {
  const points = event.nativeEvent.touches;
  if (!points.length) return null;
  const a = points[0]; const b = points[1] ?? a;
  return { count: Math.min(2, points.length), pageX: (a.pageX + b.pageX) / 2, pageY: (a.pageY + b.pageY) / 2,
    x: (a.locationX + b.locationX) / 2, y: (a.locationY + b.locationY) / 2,
    distance: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) };
}

export default function PlantPhotoFramingEditor({ uri, width, height, value, onChange, disabled = false, onInteractionChange, journalLabel }: Props) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const [viewport, setViewport] = useState<PhotoSize>({ width: 0, height: 0 });
  const [loaded, setLoaded] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [readyUri, setReadyUri] = useState<string | null>(null);
  const source = width && height && width > 0 && height > 0 ? { width, height }
    : loaded?.uri === uri ? loaded : null;
  const ready = !!source && viewport.width > 0 && viewport.height > 0 && failedUri !== uri;
  const latest = useRef({ source, viewport, value, onChange, disabled, onInteractionChange, ready });
  latest.current = { source, viewport, value, onChange, disabled, onInteractionChange, ready };
  const gesture = useRef<{ touch: Touch; framing: PhotoFraming } | null>(null);
  const active = useRef(false);
  const interact = (next: boolean) => {
    if (active.current === next) return;
    active.current = next;
    latest.current.onInteractionChange?.(next);
  };
  useEffect(() => () => { latest.current.onInteractionChange?.(false); }, []);
  useEffect(() => {
    gesture.current = null;
    if (active.current) { active.current = false; onInteractionChange?.(false); }
  }, [uri, disabled, onInteractionChange]);

  const responder = useMemo(() => {
    const allowed = () => latest.current.ready && !latest.current.disabled;
    const begin = (event: GestureResponderEvent) => {
      const current = touch(event); const state = latest.current;
      if (current && state.source && allowed()) {
        gesture.current = { touch: current, framing: photoImageLayout(state.source, state.viewport, state.value).framing };
        interact(true);
      }
    };
    const end = () => { gesture.current = null; interact(false); };
    return PanResponder.create({
      onStartShouldSetPanResponder: allowed,
      onMoveShouldSetPanResponder: allowed,
      onPanResponderGrant: begin,
      onPanResponderMove: event => {
        const current = touch(event); const start = gesture.current; const state = latest.current;
        if (!current || !state.source || !allowed()) return;
        if (!start || start.touch.count !== current.count) { begin(event); return; }
        let next = start.framing;
        if (current.count === 2 && start.touch.distance > 0) {
          next = zoomPhotoFraming(state.source, state.viewport, next,
            start.framing.zoom * current.distance / start.touch.distance,
            { x: start.touch.x, y: start.touch.y });
        }
        next = panPhotoFraming(state.source, state.viewport, next,
          current.pageX - start.touch.pageX, current.pageY - start.touch.pageY);
        latest.current.value = next;
        state.onChange(next);
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });
  }, []);

  const zoom = normalizePhotoFraming(value).zoom;
  const setZoom = (next: number) => {
    const state = latest.current;
    if (!state.source || !ready || disabled) return;
    const updated = zoomPhotoFraming(state.source, viewport, state.value, next);
    latest.current.value = updated;
    onChange(updated);
  };
  const image = ready && source ? photoImageLayout(source, viewport, value) : null;
  // Plants uses a full-width 96dp tile; these are fixed guides, not draggable handles.
  const tileAspect = Math.max(PHOTO_DETAILS_ASPECT_RATIO, (window.width - 32) / 96);
  const bandHeight = viewport.width / tileAspect;
  const blocked = disabled || !ready;
  return <View style={styles.editor}>
    <View testID="photo-framing-viewport" style={styles.viewport} {...responder.panHandlers}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0 && layout.height > 0) setViewport(previous =>
          previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height });
      }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image key={uri} source={{ uri }} resizeMode={image ? "stretch" : "contain"}
          style={image ? { position: "absolute", width: image.width, height: image.height, left: image.left, top: image.top } : StyleSheet.absoluteFill}
          onLoad={({ nativeEvent }) => {
            const size = nativeEvent.source;
            if (size.width > 0 && size.height > 0) setLoaded({ uri, width: size.width, height: size.height });
            setReadyUri(uri); setFailedUri(null);
          }} onError={() => setFailedUri(uri)} />
        {ready && <>
          <View testID="photo-details-guide" style={[StyleSheet.absoluteFill, styles.detailsGuide]} />
          {!journalLabel && <View testID="photo-tiles-guide" style={[styles.tilesGuide, { top: (viewport.height - bandHeight) / 2, height: bandHeight }]} />}
        </>}
        {readyUri !== uri && failedUri !== uri && <View style={styles.state}><CenteredSpinner size={30} /></View>}
        {failedUri === uri && <View style={styles.state}>
          <Text style={styles.hint}>{t("plantDetailsModals.changeImage.photoLoadFailed", { defaultValue: "Could not load this photo. Choose it again." })}</Text>
        </View>}
      </View>
    </View>
    <View style={styles.legend}>
      <View style={styles.legendItem}><View style={[styles.swatch, { borderColor: RED }]} /><Text style={styles.label}>
        {journalLabel || t("plantDetailsModals.changeImage.detailsGuide", { defaultValue: "Plant details" })}</Text></View>
      {!journalLabel && <View style={styles.legendItem}><View style={[styles.swatch, { borderColor: BLUE }]} /><Text style={styles.label}>
        {t("plantDetailsModals.changeImage.tilesGuide", { defaultValue: "Plants tiles" })}</Text></View>}
    </View>
    <Text style={styles.hint}>{t("plantDetailsModals.changeImage.framingHint", {
      defaultValue: "Drag to move the photo. Pinch or use the zoom controls to adjust it.",
    })}</Text>
    <View style={styles.zoomRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("plantDetailsModals.changeImage.zoomOut", { defaultValue: "Zoom out" })}
        style={[styles.iconButton, (blocked || zoom <= PHOTO_MIN_ZOOM) && styles.disabled]} disabled={blocked || zoom <= PHOTO_MIN_ZOOM}
        onPress={() => setZoom(zoom - 0.25)}><MaterialCommunityIcons name="minus" size={20} color="#FFFFFF" /></Pressable>
      <Slider style={styles.slider} minimumValue={PHOTO_MIN_ZOOM} maximumValue={PHOTO_MAX_ZOOM} value={zoom} disabled={blocked}
        accessibilityLabel={t("plantDetailsModals.changeImage.zoomLabel", { defaultValue: "Zoom" })}
        minimumTrackTintColor="#0B7285" maximumTrackTintColor="rgba(255,255,255,0.35)" thumbTintColor="#FFFFFF"
        onSlidingStart={() => interact(true)} onSlidingComplete={() => interact(false)} onValueChange={setZoom} />
      <Pressable accessibilityRole="button" accessibilityLabel={t("plantDetailsModals.changeImage.zoomIn", { defaultValue: "Zoom in" })}
        style={[styles.iconButton, (blocked || zoom >= PHOTO_MAX_ZOOM) && styles.disabled]} disabled={blocked || zoom >= PHOTO_MAX_ZOOM}
        onPress={() => setZoom(zoom + 0.25)}><MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" /></Pressable>
      <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
    </View>
    <Pressable accessibilityRole="button" disabled={blocked} style={[styles.reset, blocked && styles.disabled]}
      onPress={() => { if (source) onChange(photoImageLayout(source, viewport, DEFAULT_PHOTO_FRAMING).framing); }}>
      <MaterialCommunityIcons name="restore" size={16} color="#FFFFFF" />
      <Text style={styles.label}>{t("plantDetailsModals.changeImage.resetFraming", { defaultValue: "Reset framing" })}</Text>
    </Pressable>
  </View>;
}

const RED = "#FF7676";
const BLUE = "#61AFFF";
const styles = StyleSheet.create({
  editor: { gap: 9 },
  viewport: { width: "100%", aspectRatio: PHOTO_DETAILS_ASPECT_RATIO, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.22)" },
  detailsGuide: { borderWidth: 2, borderColor: RED, borderRadius: 18 },
  tilesGuide: { position: "absolute", left: 0, right: 0, borderWidth: 2, borderColor: BLUE },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 16, height: 11, borderWidth: 2, borderRadius: 2 },
  label: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  hint: { color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 17 },
  state: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 12 },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  slider: { flex: 1, height: 38 },
  iconButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: "rgba(255,255,255,0.14)" },
  zoomValue: { color: "#FFFFFF", fontSize: 12, minWidth: 39, textAlign: "right" },
  reset: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  disabled: { opacity: 0.45 },
});
