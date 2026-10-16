import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";

/**
 * 章の扉（設計書 2.7）。
 *
 * 章が変わったことを、いきなり部屋を出して知らせていた。
 * 第1章と第2章は**同じマップ**なので、炎の色が付いた以外に切れ目が無く、
 * 「場面が変わった」ではなく「画面が壊れた」ように見える。
 *
 * ここで一拍置く。暗転 → 章題 → 消える、それだけ。
 * 消えたあとに章頭の地の文が出るので、扉を抜けて部屋に入る形になる。
 */

/** 幕が上がる／題が出る／保つ／消える。合計 3.1 秒 */
const FADE_IN = 0.45;
const REVEAL = 0.55;
const HOLD = 1.5;
const FADE_OUT = 0.6;
const TOTAL = FADE_IN + REVEAL + HOLD + FADE_OUT;

export type TitleCard = { main: string; sub: string };

export class ChapterTitle {
  private t = 0;
  private card: TitleCard | null = null;

  get active(): boolean {
    return this.card !== null;
  }

  start(card: TitleCard): void {
    this.card = card;
    this.t = 0;
  }

  /** Enter で飛ばす。2周目以降に3秒待たせない */
  skip(): void {
    this.card = null;
  }

  update(dt: number): void {
    if (!this.card) return;
    this.t += dt;
    if (this.t >= TOTAL) this.card = null;
  }

  render(d: Display): void {
    const card = this.card;
    if (!card) return;
    const t = this.t;

    // 幕。最後の FADE_OUT で開ける
    const veil = t < TOTAL - FADE_OUT ? 1 : 1 - (t - (TOTAL - FADE_OUT)) / FADE_OUT;
    d.ctx.globalAlpha = veil;
    d.rect(0, 0, SCREEN_W, SCREEN_H, PAL.bg);
    d.ctx.globalAlpha = 1;

    // 題は幕が下りきってから浮かぶ
    const ink = clamp01((t - FADE_IN) / REVEAL) * veil;
    if (ink <= 0) return;

    const cy = SCREEN_H / 2;

    // 章題の左右へ伸びる罫。伸びきる長さは題の幅より少し広く
    const rule = Math.round(60 + 90 * clamp01((t - FADE_IN) / (REVEAL + HOLD * 0.4)));
    d.ctx.globalAlpha = ink * 0.55;
    d.rect(SCREEN_W / 2 - rule, cy - 26, rule * 2, 1, PAL.accent);
    d.rect(SCREEN_W / 2 - rule, cy + 30, rule * 2, 1, PAL.accent);

    d.ctx.globalAlpha = ink;
    const mw = d.measure(card.main, 26);
    d.text(card.main, Math.round((SCREEN_W - mw) / 2), cy - 16, PAL.ink, 26);

    d.ctx.globalAlpha = ink * 0.85;
    const sw = d.measure(card.sub, 12);
    d.text(card.sub, Math.round((SCREEN_W - sw) / 2), cy + 14, PAL.accent, 12);

    d.ctx.globalAlpha = 1;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
