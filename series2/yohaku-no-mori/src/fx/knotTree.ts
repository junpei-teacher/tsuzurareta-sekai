import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { drawDoubleLoopKnot, isForestBoundaryBackgroundReady, renderDeepForest } from "./storyArt.ts";

/** 一本の古木は静景。正確な刻みと二重結びは別レイヤーに残す。 */
export function renderKnotTree(
  d: Display,
  t: number,
  image?: HTMLImageElement,
  atmosphere = true,
): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderDeepForest(d, t, "knot");
    return;
  }
  d.clear("#071816");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (!atmosphere) return;

  // 古木の周囲だけに古金色を少量混ぜ、隣の深い森との差を光量でなく焦点で作る。
  d.ctx.save();
  for (const [x, y, phase, color] of [
    [112, 132, 2, PAL.accentCool],
    [274, 122, 7, "#d1b273"],
    [365, 135, 12, PAL.accentCool],
    [429, 117, 19, "#b9a9e6"],
  ] as const) {
    const lift = (Math.floor(t * 2.2) + phase) % 13;
    d.ctx.globalAlpha = color === "#d1b273" ? 0.11 : 0.09;
    d.rect(x, y - lift, lift % 4 === 0 ? 2 : 1, 1, color);
  }
  d.ctx.restore();
}

/** 生成背景へ焼き込まない、左下がりの筆跡とセナの二重結び。 */
export function drawKnotTreeClue(d: Display, known: boolean): void {
  const ctx = d.ctx;
  ctx.save();
  ctx.globalAlpha = known ? 0.94 : 0.78;
  ctx.strokeStyle = "#b5bba5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [x, y] of [[334, 75], [332, 87], [330, 99]] as const) {
    ctx.moveTo(x, y);
    ctx.lineTo(x - 11, y + 6);
  }
  ctx.stroke();
  d.rect(316, 112, 22, 2, "#806747");
  drawDoubleLoopKnot(d, 327, 119, 1.25, "#d1b273", known ? 1 : 0.88);
  ctx.restore();
}

