import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { drawForestBoundaryAtmosphere, isForestBoundaryBackgroundReady, renderShallowForest } from "./storyArt.ts";

export type HunterCampStoryState = {
  campClear: boolean;
  recordRead: boolean;
};

/** 幕や荷は静景、手帳・熾火・敵は進行に応じて重ねる。 */
export function renderHunterCamp(d: Display, t: number, image?: HTMLImageElement, atmosphere = true): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderShallowForest(d, t, "camp");
    return;
  }
  d.clear("#193a32");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (atmosphere) drawForestBoundaryAtmosphere(d, t);
}

export function drawHunterCampStoryState(d: Display, t: number, state: HunterCampStoryState): void {
  // 火床は戦闘前から残る。炎ではなく、消えない小さな熾火として読む。
  d.rect(323, 171, 34, 3, "#2b2b24");
  d.rect(326, 168, 6, 3, "#6e6550");
  d.rect(337, 169, 7, 3, "#82714b");
  d.rect(348, 168, 6, 3, "#6e6550");
  const pulse = Math.floor(t * 3) % 2;
  d.rect(332, 170 - pulse, 7, 2, "#c56f43");
  d.rect(340, 169 + pulse, 6, 2, PAL.accent);
  d.rect(336, 168, 3, 2, "#e2bd69");

  // 猪を退けると手帳が読める。読後も閉じた冊子として幕営に残す。
  if (!state.campClear) return;
  const y = state.recordRead ? 164 : 161;
  d.rect(365, y, 13, 8, "#49392b");
  d.rect(366, y + 1, 11, 6, state.recordRead ? "#88734f" : "#c5ad76");
  d.rect(371, y + 1, 1, 6, "#5d4b35");
  if (!state.recordRead) d.rect(368, y + 2, 3, 1, "#756044");
}
