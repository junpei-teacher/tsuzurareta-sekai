import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { drawForestBoundaryAtmosphere, isForestBoundaryBackgroundReady, renderShallowForest } from "./storyArt.ts";

export type GuardianHollowStoryState = {
  opened: boolean;
};

/** 巨木と根床は静景、足跡と入口を横切る細根は進行に応じて重ねる。 */
export function renderGuardianHollow(d: Display, t: number, image?: HTMLImageElement, atmosphere = true): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderShallowForest(d, t, "hollow");
    return;
  }
  d.clear("#18372f");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (atmosphere) drawForestBoundaryAtmosphere(d, t);
}

export function drawGuardianHollowStoryState(d: Display, t: number, state: GuardianHollowStoryState): void {
  // 狩人頭の靴跡は奥へ、魔物の跡は外へ向く。背景へ焼き込まず台本の手掛かりとして残す。
  const soil = "#66533b";
  for (let i = 0; i < 4; i++) {
    const x = 296 + i * 15;
    const y = 171 + (i % 2) * 2;
    d.rect(x, y, 6, 2, soil);
    d.rect(x + 2, y - 3, 3, 3, soil);
  }
  for (let i = 0; i < 3; i++) {
    const x = 337 - i * 17;
    const y = 164 - (i % 2) * 2;
    d.rect(x, y, 3, 3, "#394638");
    d.rect(x - 4, y - 3, 2, 2, "#394638");
    d.rect(x + 4, y - 3, 2, 2, "#394638");
  }

  if (state.opened) {
    // 調査後は入口を横切っていた細根を足元へ寄せ、通れる状態を示す。
    d.rect(355, 169, 19, 2, "#746341");
    d.rect(365, 167, 10, 2, "#8b7650");
    return;
  }

  const sway = Math.floor(t * 2) % 2;
  d.rect(360 + sway, 135, 2, 31, "#756340");
  d.rect(357 + sway, 143, 2, 23, "#8b7650");
  d.rect(362 + sway, 151, 5, 2, PAL.accentCool);
}
