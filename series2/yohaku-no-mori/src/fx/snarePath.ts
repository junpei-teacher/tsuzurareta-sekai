import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { drawForestBoundaryAtmosphere, isForestBoundaryBackgroundReady, renderShallowForest } from "./storyArt.ts";

/** 景観だけを画像へ置き換え、罠喰い蔓・守人・会話は実Sceneの動的層に残す。 */
export function renderSnarePath(d: Display, t: number, image?: HTMLImageElement, atmosphere = true): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderShallowForest(d, t, "snare");
    return;
  }
  d.clear("#193a32");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (atmosphere) drawForestBoundaryAtmosphere(d, t);
}
