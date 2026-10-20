import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";

/**
 * 光のにじみ（ブルーム）と光だまり。
 *
 * ドラクエIII HD-2D 系の「美しさ」の正体は、3Dライティングと後処理のにじみである。
 * 3Dは無理だが、**にじみと光だまりは Canvas の加算合成で再現できる。**
 * 生成クレジットを1発も使わずに、画面の印象をいちばん大きく変えられる部分。
 *
 * 手順:
 *   1. 光源だけを裏キャンバスに、大きなぼけた円で描く
 *   2. それを加算合成で本編に重ねる（＝にじみ）
 *   3. さらに全体へごく淡い暖色のかぶりを乗せる
 *
 * 裏キャンバスは本編の 1/2 の解像度で持つ。どうせぼかすので粗くてよく、
 * 塗る面積が 1/4 になるぶん軽い。
 */

export type Light = {
  /** デザイン単位の中心座標 */
  x: number;
  y: number;
  /** 光の届く半径（デザイン単位） */
  radius: number;
  /** 0..1 */
  strength: number;
  color: string;
};

const DOWN = 2;

export class BloomLayer {
  private readonly buf: HTMLCanvasElement;
  private readonly bctx: CanvasRenderingContext2D;
  private t = 0;

  constructor() {
    this.buf = document.createElement("canvas");
    this.buf.width = Math.ceil(SCREEN_W / DOWN);
    this.buf.height = Math.ceil(SCREEN_H / DOWN);
    const c = this.buf.getContext("2d");
    if (!c) throw new Error("ブルーム用の2Dコンテキストを取得できませんでした");
    this.bctx = c;
  }

  update(dt: number): void {
    this.t += dt;
  }

  /**
   * 光源を描き込む。
   * @param ambient 画面全体にかける暖色のかぶり（0で無し）
   */
  render(d: Display, lights: readonly Light[], ambient = 0.05, ambientColor = "#c8792f"): void {
    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, this.buf.width, this.buf.height);
    b.globalCompositeOperation = "lighter";

    for (const l of lights) {
      // 炎ごとに位相をずらして、同期して脈打たないようにする
      const flicker = 0.85 + 0.15 * Math.sin(this.t * 7 + l.x * 0.7 + l.y * 0.3);
      const r = (l.radius * flicker) / DOWN;
      const cx = l.x / DOWN;
      const cy = l.y / DOWN;

      const g = b.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = l.strength * flicker;
      g.addColorStop(0, withAlpha(l.color, a));
      g.addColorStop(0.35, withAlpha(l.color, a * 0.45));
      g.addColorStop(1, withAlpha(l.color, 0));
      b.fillStyle = g;
      b.beginPath();
      b.arc(cx, cy, r, 0, Math.PI * 2);
      b.fill();
    }

    const ctx = d.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // 裏キャンバスは 1/DOWN 解像度。引き伸ばすときだけ補間を許して、にじみを作る
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, SCREEN_W, SCREEN_H);

    if (ambient > 0) {
      ctx.globalAlpha = ambient;
      ctx.fillStyle = ambientColor;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${Math.max(0, Math.min(1, a))})`;
}
