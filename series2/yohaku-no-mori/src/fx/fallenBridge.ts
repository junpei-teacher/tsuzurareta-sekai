import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { drawForestBoundaryAtmosphere, isForestBoundaryBackgroundReady, renderShallowForest } from "./storyArt.ts";

/** 橋の地形だけを画像候補で比較する。蛾・結び目・会話は本編の動的層。 */
export function renderFallenBridge(d: Display, t: number, image?: HTMLImageElement, atmosphere = true): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderShallowForest(d, t, "bridge");
    return;
  }
  d.clear("#193a32");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (atmosphere) drawForestBoundaryAtmosphere(d, t);
}
