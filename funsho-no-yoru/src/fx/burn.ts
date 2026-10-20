import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { makeRng } from "./easing.ts";

/**
 * 第2章の炎上表現（設計書 2.8）。
 *
 * **マップデータもアセットも複製しない。** 描画時に色を変換し、
 * 灰と火の粉のレイヤーを重ねるだけで、第1章と同じ部屋を燃やす。
 * 実装コストはほぼゼロで、体験の破壊力は最大になる。
 */

const cache = new Map<string, string>();

/**
 * 色を炎上時のパレットへ寄せる。
 * 赤を持ち上げ、緑と青を落とす。全体は暗くする（煙の中なので）。
 */
export function scorch(hex: string): string {
  const hit = cache.get(hex);
  if (hit) return hit;

  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;

  const nr = Math.min(255, Math.round(r * 1.15 + 34));
  const ng = Math.round(g * 0.62 + 8);
  const nb = Math.round(b * 0.42);

  const out = "#" + [nr, ng, nb].map((v) => v.toString(16).padStart(2, "0")).join("");
  cache.set(hex, out);
  return out;
}

type Ember = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number };

export class BurnLayer {
  private embers: Ember[] = [];
  private rng = makeRng(0xB0F1);
  private t = 0;
  private spawnAcc = 0;

  update(dt: number): void {
    this.t += dt;

    // 火の粉を一定間隔で湧かせる
    this.spawnAcc += dt;
    while (this.spawnAcc > 0.05) {
      this.spawnAcc -= 0.05;
      const life = 1.2 + this.rng() * 2.2;
      this.embers.push({
        x: this.rng() * SCREEN_W,
        y: SCREEN_H + 4,
        vx: (this.rng() - 0.5) * 14,
        vy: -(16 + this.rng() * 34),
        life, max: life,
        size: this.rng() < 0.15 ? 2 : 1,
      });
    }

    for (const e of this.embers) {
      e.life -= dt;
      e.x += e.vx * dt + Math.sin(this.t * 2 + e.y * 0.05) * 6 * dt;
      e.y += e.vy * dt;
    }
    this.embers = this.embers.filter((e) => e.life > 0 && e.y > -8);
  }

  /**
   * 絵そのものを炎の色へ寄せる。**タイルと家具を描いた直後、ブルームより前**に呼ぶ。
   *
   * `scorch()` は色を1つずつ変換する関数で、矩形を手描きしていた頃はそれで足りた。
   * タイルセットを入れてからは絵が画像になったので、**関数では色を触れない。**
   * そのため第2章が第1章と同じ見た目のままになっていた。
   *
   * 乗算合成なら画像の上からまとめて色を寄せられる。
   * 冷たい灰色の石床が、熾火に照らされた石の色になる。
   * 加算（`render` のほう）では明るくするしかできず、これはできない。
   */
  renderTint(d: Display): void {
    const ctx = d.ctx;
    const pulse = 0.66 + 0.06 * Math.sin(this.t * 2.3);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = pulse;
    d.rect(0, 0, SCREEN_W, SCREEN_H, "#ff8438");
    ctx.restore();
  }

  /** ブルームの後、UIの前に重ねる。火の粉と煙 */
  render(d: Display): void {
    const ctx = d.ctx;

    // 火明かりのゆらぎ。画面全体がわずかに脈打つ
    const pulse = 0.06 + 0.035 * Math.sin(this.t * 3.1) + 0.02 * Math.sin(this.t * 7.7);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = pulse;
    d.rect(0, 0, SCREEN_W, SCREEN_H, "#c8542a");

    for (const e of this.embers) {
      ctx.globalAlpha = Math.min(1, e.life / e.max) * 0.85;
      ctx.fillStyle = e.life / e.max > 0.6 ? "#f0b83c" : "#c8542a";
      ctx.fillRect(e.x | 0, e.y | 0, e.size, e.size);
    }
    ctx.restore();

    // 煙で四隅が沈む
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 10; i++) {
      const a = i / 10;
      d.rect(0, i, SCREEN_W, 1, "#0a0604");
      d.rect(0, SCREEN_H - 1 - i, SCREEN_W, 1, "#0a0604");
      ctx.globalAlpha = 0.5 * (1 - a);
    }
    ctx.restore();
  }
}
