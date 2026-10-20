import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { isForestBoundaryBackgroundReady, renderDeepForest } from "./storyArt.ts";

export type RootHollowEntryStoryState = {
  cleared: boolean;
};

/** 根と岩の静景は画像、微かな反響光と攻略後の蔓だけを進行レイヤーに残す。 */
export function renderRootHollowEntry(
  d: Display,
  t: number,
  image?: HTMLImageElement,
  atmosphere = true,
): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderDeepForest(d, t, "entry");
    return;
  }
  d.clear("#0c211d");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (!atmosphere) return;

  // 反響標の周りだけ空気がゆっくり明滅する。標そのものはEncounter側で描く。
  const pulse = 0.18 + Math.sin(t * 1.4) * 0.05;
  d.ctx.save();
  d.ctx.globalAlpha = pulse;
  d.rect(72, 164, 52, 2, PAL.accentCool);
  d.rect(82, 160, 32, 1, "#d3bd72");
  for (let i = 0; i < 7; i++) {
    const x = 48 + ((i * 67 + Math.floor(t * (3 + i % 2))) % 390);
    const y = 46 + ((i * 31 - Math.floor(t * 2)) % 92 + 92) % 92;
    d.rect(x, y, i % 3 === 0 ? 2 : 1, 1, i % 2 === 0 ? PAL.accentCool : "#d3bd72");
  }
  d.ctx.restore();
}

export function drawRootHollowEntryStoryState(
  d: Display,
  t: number,
  state: RootHollowEntryStoryState,
): void {
  if (!state.cleared) return;
  // 撃破後も「ここを塞いでいたもの」が分かるよう、ほどけた蔓を薄く残す。
  const lift = Math.floor(t * 1.3) % 2;
  d.rect(205, 171 + lift, 31, 3, "#405e43");
  d.rect(229, 168 + lift, 24, 3, "#6f8757");
  d.rect(244, 165 + lift, 4, 6, "#9a9362");
}
