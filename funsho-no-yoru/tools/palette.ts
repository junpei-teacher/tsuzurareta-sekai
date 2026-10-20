/**
 * アートバイブルのパレット（docs/アートバイブル.md 第2節）。
 * 生成物の減色・ゲーム側の描画色は、すべてここを唯一の出典にする。
 *
 * 【この構成に至った経緯】
 * 当初は16色1本で組んでいたが、最初のキャラを減色した瞬間に2つ壊れた。
 *   1. **肌色が1色も無かった** → 顔と手が「炎」に吸われて真っオレンジになった
 *   2. **藍と紫がスプライトに混ざった** → 青い目が紫の点になり、顔が傷んで見えた
 *   3. **中間グレーが無かった** → 灰色のローブが「苔」に吸われて緑になった
 *
 * そこで用途で分ける。
 *   ASSET … キャラ・敵・マップチップの減色に使う16色。寒色を含めない
 *   EXTRA … UI・エフェクト専用。スプライトには絶対に混ぜない
 */

export type Swatch = { hex: string; name: string };

/** スプライト用16色。減色（palettize）はこれだけを使う */
export const PALETTE_ASSET: ReadonlyArray<Swatch> = [
  { hex: "#0a0806", name: "墨" },       // 最暗部・輪郭
  { hex: "#14100f", name: "闇" },
  { hex: "#241d16", name: "影" },
  { hex: "#3b322a", name: "石" },       // 壁・床
  { hex: "#6b6156", name: "中灰" },     // 埃っぽい布。ミラのローブ
  { hex: "#5c4b3a", name: "木" },       // 書架・机
  { hex: "#8a7a58", name: "古紙の影" },
  { hex: "#c9bb95", name: "古紙" },
  { hex: "#e8dcc0", name: "象牙" },     // 最明部
  { hex: "#7a3f20", name: "焦げ" },     // 革・焼けた木
  { hex: "#b0463a", name: "血" },
  { hex: "#e07a34", name: "炎" },
  { hex: "#f0b83c", name: "灯" },       // 蝋燭
  { hex: "#9a9080", name: "灰" },       // 石の明部・煙
  { hex: "#d2a077", name: "肌" },
  { hex: "#a06a4a", name: "肌影" },
];

/** UI・エフェクト専用。**スプライトの減色には使わない** */
export const PALETTE_EXTRA: ReadonlyArray<Swatch> = [
  { hex: "#4f5f52", name: "苔" },   // 本の背表紙・古い金属
  { hex: "#3f6fa8", name: "藍" },   // MPゲージ・氷
  { hex: "#6b4f7a", name: "紫" },   // レア帯・魔
];

export type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export const ASSET_RGB: RGB[] = PALETTE_ASSET.map((c) => hexToRgb(c.hex));

/**
 * 最も近いパレット色を返す。
 * 人間の目の感度に合わせて緑を重く見る。
 */
export function nearest(c: RGB, palette: RGB[] = ASSET_RGB): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i]!;
    const dr = c.r - p.r;
    const dg = c.g - p.g;
    const db = c.b - p.b;
    const d = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
