import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { isForestBoundaryBackgroundReady, renderDeepForest } from "./storyArt.ts";

export type EchoGalleryStoryState = {
  cleared: boolean;
};

/** 根と白い繊維は静景。ごく弱い反響光だけを動的に重ねる。 */
export function renderEchoGallery(
  d: Display,
  t: number,
  image?: HTMLImageElement,
  atmosphere = true,
): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderDeepForest(d, t, "echo_gallery");
    return;
  }
  d.clear("#0a1d1a");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (!atmosphere) return;

  // 背景の繊維に沿って光点が往復する。鹿の輪郭を邪魔しない低い明度に留める。
  const phase = Math.floor(t * 6) % 28;
  d.ctx.save();
  d.ctx.globalAlpha = 0.16 + Math.sin(t * 1.8) * 0.04;
  for (const [x, y] of [[158, 69], [286, 82], [392, 57], [432, 103]] as const) {
    d.rect(x, y + phase, 2, 5, PAL.accentCool);
    d.rect(x + 3, y + 5 + (27 - phase), 1, 3, "#d8cfaa");
  }
  d.ctx.restore();
}

/** 狩人の外套は背景へ焼き込まず、鹿の浮遊と攻略状態へ追従させる。 */
export function drawEchoGalleryStoryState(
  d: Display,
  t: number,
  state: EchoGalleryStoryState,
): void {
  if (state.cleared) {
    // 鹿が道を譲った後、外套は傷つかないまま足元へ置かれている。
    d.rect(255, 168, 29, 8, "#6e554b");
    d.rect(260, 165, 19, 4, "#9a765d");
    d.rect(270, 164, 3, 5, "#d3ab69");
    return;
  }

  const y = 176 + Math.sin(t * 2.4 + 252) * 1.2;
  // 右枝角へ柔らかく掛かった外套。布の端は胴体より手前へ垂らす。
  d.rect(268, y - 57, 15, 5, "#9a765d");
  d.rect(273, y - 53, 14, 17, "#6e554b");
  d.rect(277, y - 38, 10, 5, "#876954");
  d.rect(281, y - 52, 3, 3, "#d3ab69");
}
