import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { isForestBoundaryBackgroundReady, renderDeepForest } from "./storyArt.ts";

/** 閉じた樹冠と白根は静景。第三章の記憶色だけを弱く漂わせる。 */
export function renderDeepForestPath(
  d: Display,
  t: number,
  image?: HTMLImageElement,
  atmosphere = true,
): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderDeepForest(d, t, "deep");
    return;
  }
  d.clear("#071816");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (!atmosphere) return;

  // 白根の輪郭を発光線へ変えず、隙間から小さな記憶色だけが浮く。
  d.ctx.save();
  d.ctx.globalAlpha = 0.12 + (Math.sin(t * 1.1) + 1) * 0.025;
  for (const [x, y, phase, color] of [
    [82, 137, 0, PAL.accentCool],
    [239, 128, 8, "#b9a9e6"],
    [294, 143, 13, PAL.accentCool],
    [449, 120, 19, "#d3a9df"],
  ] as const) {
    const lift = (Math.floor(t * 2.5) + phase) % 14;
    d.rect(x, y - lift, lift % 4 === 0 ? 2 : 1, 1, color);
  }
  d.ctx.restore();
}
