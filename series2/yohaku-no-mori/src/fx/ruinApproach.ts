import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { isForestBoundaryBackgroundReady, renderRuinExterior } from "./storyArt.ts";

/** 森の青から遺跡の青緑・古金へ移る、第三章最初の遺跡景観。 */
export function renderRuinApproach(
  d: Display,
  t: number,
  image?: HTMLImageElement,
  atmosphere = true,
): void {
  if (!isForestBoundaryBackgroundReady(image)) {
    renderRuinExterior(d, t, "approach");
    return;
  }

  d.clear("#061a25");
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
  d.ctx.restore();
  if (!atmosphere) return;

  // 新地域の鮮やかさは画面全体の彩度ではなく、石の冷光と古金の少数点で作る。
  const motes = [
    [42, 129, 1, "#5dd6d2"],
    [118, 113, 5, "#52b8df"],
    [260, 120, 9, "#9e87d5"],
    [320, 98, 13, "#63d8cb"],
    [402, 109, 17, "#dfbd69"],
    [452, 133, 21, "#68bfe3"],
  ] as const;
  d.ctx.save();
  for (const [x, y, phase, color] of motes) {
    const lift = (Math.floor(t * 2) + phase) % 15;
    d.ctx.globalAlpha = color === "#dfbd69" ? 0.20 : 0.14;
    d.rect(x, y - lift, lift % 5 === 0 ? 2 : 1, 1, color);
  }
  // 門の奥だけにごく薄い青緑を返し、黒い穴ではなく次の場所として見せる。
  d.ctx.globalAlpha = 0.10 + Math.sin(t * 1.15) * 0.018;
  d.rect(398, 91, 22, 48, "#54c6c7");
  d.ctx.restore();
}

/** 背景には焼き込まない、古い王国の校訂印と十年前を示す十個の刻み。 */
export function drawRuinApproachClue(d: Display, known: boolean): void {
  const ctx = d.ctx;
  const ink = known ? "#dfbd69" : "#a98b62";
  ctx.save();
  ctx.globalAlpha = known ? 0.96 : 0.82;

  // 二重枠と中央の欠損で、現王国の完全な紋章ではなく古い校訂印にする。
  d.frame(353, 92, 20, 23, ink);
  d.frame(356, 95, 14, 17, "#75c8c1");
  d.rect(361, 98, 4, 11, ink);
  d.rect(358, 102, 10, 3, ink);
  d.rect(363, 102, 5, 3, "#243d46");

  // 数字や文字を描かず、5刻みを二列にして十年前という物理的な日付記録を残す。
  for (let i = 0; i < 10; i++) {
    const x = 354 + (i % 5) * 4;
    const y = 119 + Math.floor(i / 5) * 4;
    d.rect(x, y, 2, 2, i === 9 && known ? PAL.accent : "#8aa49e");
  }
  ctx.restore();
}
