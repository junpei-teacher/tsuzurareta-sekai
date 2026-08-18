import { PAL } from "./palette.ts";

// 設計書 7.2 — 内部解像度 480x270、整数倍スケール

/**
 * 座標系（デザイン単位）。全シーンはこの座標で描く。
 * 実際のキャンバスは PIXEL_SCALE 倍で、変換行列が自動で拡大する。
 */
export const SCREEN_W = 480;
export const SCREEN_H = 270;

/**
 * デザイン単位あたりの実ピクセル数。
 *
 * 1 だった頃はタイル16px・キャラ32pxで、「これ以上細かく描けない」状態だった。
 * 2 にすることで**素材の情報量が4倍**になる。タイルは32px、キャラは64px。
 * UIの座標は1つも書き換えずに済むよう、変換行列で吸収している。
 *
 * 実解像度 960x540。1920x1080 にちょうど2倍で収まる。
 */
export const PIXEL_SCALE = 2;

/** 日本語ドットフォント。Phase 0-5 で PixelMplus12 を入れるまでは等幅で代用する */
const FONT_STACK = "'PixelMplus12', 'MS Gothic', monospace";

/** 描画できるもの。加工した裏キャンバスも画像と同じように扱いたい */
export type Drawable = HTMLImageElement | HTMLCanvasElement;

export class Display {
  readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  /** 単色シルエットの作り置き。画像×色ごとに一度だけ作る */
  private readonly silhouettes = new Map<string, HTMLCanvasElement>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = SCREEN_W * PIXEL_SCALE;
    canvas.height = SCREEN_H * PIXEL_SCALE;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2Dコンテキストを取得できませんでした");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.textBaseline = "top";

    this.fitToWindow();
    window.addEventListener("resize", () => this.fitToWindow());
  }

  /**
   * ウィンドウに収まる最大の整数倍でCSS拡大する。
   * ウィンドウが内部解像度より小さい場合だけ、はみ出しを避けるため
   * 例外的に等倍未満（非整数）へ縮小する。
   */
  private fitToWindow(): void {
    const raw = Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H);
    const scale = raw >= 1 ? Math.floor(raw) : raw;
    this.canvas.style.width = `${SCREEN_W * scale}px`;
    this.canvas.style.height = `${SCREEN_H * scale}px`;
  }

  clear(color: string = PAL.bg): void {
    // 毎フレームここで変換行列を張り直す。以降の描画はすべてデザイン単位でよい
    this.ctx.setTransform(PIXEL_SCALE, 0, 0, PIXEL_SCALE, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  /** 1px の枠線 */
  frame(x: number, y: number, w: number, h: number, color: string): void {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  text(str: string, x: number, y: number, color: string = PAL.ink, size = 12): void {
    this.ctx.font = `${size}px ${FONT_STACK}`;
    this.ctx.fillStyle = color;
    this.ctx.fillText(str, x | 0, y | 0);
  }

  /**
   * 行を描く。**大文字が3つ以上続く部分だけ色を変える。**
   *
   * この世界のアルファベットは、飾りではなく**打ち込む文字列**である。
   * `ROZHA` も `MIRA` も、プレイヤーがいつか自分で打つことになる。
   * 地の文と同じ色で流すと、ただの読み物として通り過ぎてしまう。
   *
   * 印を付ける必要はない。日本語の本文に大文字が3つ以上続くのは
   * この作品では呪文か名前だけなので、そのまま拾える。
   *
   * @param shown 実際に描く文字列（1文字ずつ表示の途中なら、その途中まで）
   * @param full  範囲の判定に使う全文。途中で色が変わらないように分けてある
   */
  textRich(
    shown: string, x: number, y: number,
    base: string, accent: string, size = 12, full = shown,
  ): void {
    const ranges: Array<[number, number]> = [];
    for (const m of full.matchAll(/[A-Z][A-Z0-9]{2,}/g)) {
      ranges.push([m.index, m.index + m[0].length]);
    }
    // 欠けた綴り（`H A _ A L`）も呪文と同じ色で拾う。
    // 一字ずつ空けて書いてあるので上の規則には掛からないが、
    // **プレイヤーが覚えて帰るのはこの一行**なので、地の文に沈めてはいけない。
    // 3組以上を条件にして、「MIRA WAS HERE」のような普通の英文を巻き込まないようにする
    for (const m of full.matchAll(/(?<![A-Z0-9])[A-Z_](?: [A-Z_]){2,}(?![A-Z0-9])/g)) {
      ranges.push([m.index, m.index + m[0].length]);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    if (ranges.length === 0) { this.text(shown, x, y, base, size); return; }

    let cx = x;
    let i = 0;
    while (i < shown.length) {
      const hit = ranges.find(([s, e]) => i >= s && i < e);
      const end = hit
        ? Math.min(hit[1], shown.length)
        : (ranges.find(([s]) => s > i)?.[0] ?? shown.length);
      const seg = shown.slice(i, end);
      this.text(seg, cx, y, hit ? accent : base, size);
      cx += this.measure(seg, size);
      i = end;
    }
  }

  /** 右端を x に揃えて描く */
  textRight(str: string, x: number, y: number, color: string = PAL.ink, size = 12): void {
    this.ctx.font = `${size}px ${FONT_STACK}`;
    const w = this.ctx.measureText(str).width;
    this.ctx.fillStyle = color;
    this.ctx.fillText(str, (x - w) | 0, y | 0);
  }

  /**
   * スプライトを等倍で描く。
   *
   * 変換行列が PIXEL_SCALE 倍かかっているので、
   * **デザイン単位では 1/PIXEL_SCALE のサイズで置く**。
   * 結果として実ピクセルは1:1になり、ドットが崩れない。
   */
  sprite(img: Drawable, x: number, y: number): void {
    this.ctx.drawImage(
      img, x | 0, y | 0,
      img.width / PIXEL_SCALE, img.height / PIXEL_SCALE,
    );
  }

  /** スプライトの幅・高さをデザイン単位で返す */
  spriteW(img: Drawable): number {
    return img.width / PIXEL_SCALE;
  }
  spriteH(img: Drawable): number {
    return img.height / PIXEL_SCALE;
  }

  /**
   * 足元を (cx, bottomY) に合わせて置く。横は中央揃え。
   *
   * **スプライトの寸法は生ピクセルなので、位置合わせには必ずデザイン単位へ直す。**
   * ここを直し忘れると、解像度を上げたときにキャラだけ数マス浮いて描かれる。
   */
  spriteFoot(img: Drawable, cx: number, bottomY: number): void {
    this.sprite(img, cx - this.spriteW(img) / 2, bottomY - this.spriteH(img));
  }

  /**
   * 不透明な部分だけを単色で塗り潰した版を返す。被弾フラッシュに使う。
   *
   * ctx.filter でも似たことはできるが、対応状況に差があって黙って無視される。
   * source-in 合成なら結果が読めるので、こちらを採る。
   * 作り置きするので、毎フレーム呼んでも一度しか塗らない。
   */
  silhouette(img: Drawable, color: string): HTMLCanvasElement {
    const key = `${img instanceof HTMLImageElement ? img.src : "canvas"}|${color}`;
    const cached = this.silhouettes.get(key);
    if (cached) return cached;

    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d");
    if (!g) return c;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);

    this.silhouettes.set(key, c);
    return c;
  }

  /** スプライトシートの一部を等倍で描く */
  spriteRect(
    img: Drawable,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number,
  ): void {
    this.ctx.drawImage(
      img, sx, sy, sw, sh,
      dx | 0, dy | 0, sw / PIXEL_SCALE, sh / PIXEL_SCALE,
    );
  }

  measure(str: string, size = 12): number {
    this.ctx.font = `${size}px ${FONT_STACK}`;
    return this.ctx.measureText(str).width;
  }
}
