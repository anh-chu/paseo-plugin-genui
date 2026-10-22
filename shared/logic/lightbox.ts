export type LightboxView = { readonly zoom: number; readonly x: number; readonly y: number };

export const MAX_ZOOM = 8;

export function clampZoom(zoom: number, fit: number): number {
  return Math.min(MAX_ZOOM, Math.max(Math.min(fit, 1), zoom));
}

/** Zooms by `factor` keeping the image point under `at` still; `at` and x/y are offsets from the stage centre. */
export function zoomAt(view: LightboxView, factor: number, at: { x: number; y: number }, fit: number): LightboxView {
  const zoom = clampZoom(view.zoom * factor, fit);
  const ratio = zoom / view.zoom;
  if (zoom <= fit) return { zoom, x: 0, y: 0 };
  return { zoom, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio };
}

/** Wheel delta to zoom factor; trackpad pinch arrives as a ctrl+wheel with small deltas. */
export function wheelFactor(deltaY: number, pinch: boolean): number {
  return Math.exp(-deltaY * (pinch ? 0.01 : 0.0015));
}
