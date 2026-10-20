import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { drawForestBoundaryAtmosphere, isForestBoundaryBackgroundReady, renderShallowForest } from "./storyArt.ts";

/** 涸れ沢の任意背景。狼・狩人・会話はSideViewSceneが進行状態から重ねる。 */
export function renderDryCreek(d: Display, t: number, image?: HTMLImageElement, atmosphere = true): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderShallowForest(d, t, "creek");
    return;
  }
  d.clear("#193a32");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (atmosphere) drawForestBoundaryAtmosphere(d, t);
}
