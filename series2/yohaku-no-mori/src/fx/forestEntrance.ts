import type { Display } from "../core/display.ts";
import type { ImageMap } from "../core/imageLoader.ts";
import { FOREST_EDGE_BACKGROUND_ID, SERIES2_ASSETS } from "../core/series2Assets.ts";
import { drawForestEntranceAtmosphere, drawForestEntranceTracks, renderForestEntrance } from "./storyArt.ts";

/** 本編の森入口。静的素材以外は独立したコード層で描く。 */
export function renderForestEntranceScene(d: Display, t: number, images: ImageMap): void {
  const image = images[FOREST_EDGE_BACKGROUND_ID];
  const spec = SERIES2_ASSETS[FOREST_EDGE_BACKGROUND_ID];
  // 読込失敗だけでなく未完了・寸法違いも、遊べるコード背景へ戻す。
  if (!image?.complete || image.naturalWidth !== spec.width || image.naturalHeight !== spec.height) {
    renderForestEntrance(d, t);
    return;
  }
  d.clear();
  d.sprite(image, 0, 0);
  drawForestEntranceTracks(d, { sole: "#473a2c", paw: "#342e28" });
  drawForestEntranceAtmosphere(d, t);
}
