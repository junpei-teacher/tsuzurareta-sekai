import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { isForestBoundaryBackgroundReady, renderDeepForest } from "./storyArt.ts";

export type RootHeartStoryState = {
  wardenYielded: boolean;
  hunterFound: boolean;
};

/** 守護樹心部の静景へ、呼吸する樹液光だけを小さく重ねる。 */
export function renderRootHeart(
  d: Display,
  t: number,
  image?: HTMLImageElement,
  atmosphere = true,
): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderDeepForest(d, t, "root_heart");
    return;
  }
  d.clear("#0a1d1a");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (!atmosphere) return;

  // 心臓のように速く脈打たせず、長い呼吸に見える周期へ抑える。
  const breath = 0.08 + (Math.sin(t * 1.35) + 1) * 0.035;
  d.ctx.save();
  d.ctx.globalAlpha = breath;
  d.rect(326, 66, 52, 2, PAL.accentCool);
  d.rect(334, 61, 36, 1, "#d8cfaa");
  for (const [x, y, phase] of [[77, 142, 0], [184, 119, 7], [409, 134, 13], [445, 104, 19]] as const) {
    const lift = (Math.floor(t * 3) + phase) % 18;
    d.rect(x, y - lift, lift % 5 === 0 ? 2 : 1, 1, PAL.accentCool);
  }
  d.ctx.restore();
}

/** 折れた弓は台詞と同じ場所に残し、背景画像へ進行状態を焼き込まない。 */
export function drawRootHeartStoryState(
  d: Display,
  t: number,
  state: RootHeartStoryState,
): void {
  const settle = state.hunterFound ? 1 : Math.floor(t * 1.2) % 2;
  const ctx = d.ctx;
  ctx.save();
  ctx.strokeStyle = "#8f7045";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(348, 174 + settle);
  ctx.quadraticCurveTo(356, 164 + settle, 365, 171 + settle);
  ctx.moveTo(370, 172 + settle);
  ctx.quadraticCurveTo(379, 166 + settle, 386, 174 + settle);
  ctx.stroke();
  ctx.strokeStyle = "#d1b273";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(349, 174 + settle);
  ctx.lineTo(365, 171 + settle);
  ctx.moveTo(370, 172 + settle);
  ctx.lineTo(385, 174 + settle);
  ctx.stroke();
  ctx.restore();

  if (!state.wardenYielded) return;
  // 番人が退いた後も、根を傷つけて勝ったわけではないことを示す伏せた枝先。
  d.rect(286, 171, 32, 3, "#607b5b");
  d.rect(305, 167, 23, 3, "#8fa278");
  d.rect(321, 164, 4, 6, PAL.accentCool);
}
