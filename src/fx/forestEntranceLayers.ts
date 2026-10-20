import { Display, SCREEN_H, SCREEN_W, type Drawable } from "../core/display.ts";

/** v19採用素材の書き出し構成値。素材のドットを変形せず、カメラ位置だけを変える。 */
export const FOREST_ENTRANCE_LAYERS = {
  forestTop: 64,
  forestBottom: 263, // A原本の下端7行にある不要な明色帯を表示しない。
  soilTop: 142,
  soilHeight: 128,
  blendRows: 12,
  groundY: 176,
} as const;

let mudClip: Path2D | undefined;

function mudMask(): Path2D {
  if (mudClip) return mudClip;
  const path = new Path2D();
  // 調査点の湿った土。樹皮や道の細かい模様と、靴跡・爪跡が競合しない小さな面。
  for (const [x, y, w, h] of [[105, 148, 48, 4], [95, 152, 74, 4], [89, 156, 88, 4],
    [88, 160, 94, 17], [95, 177, 80, 5], [107, 182, 59, 4]] as const) path.rect(x, y, w, h);
  mudClip = path;
  return path;
}

/** 静的な景観のみ。足跡、人物、狼、光、UIは呼出側の独立した層。 */
export function renderForestEntranceLayers(d: Display, forest: Drawable, soil: Drawable): void {
  const { forestTop, forestBottom, soilTop, soilHeight, blendRows } = FOREST_ENTRANCE_LAYERS;
  d.clear("#665643");
  d.ctx.drawImage(soil, 0, 0, SCREEN_W, soilHeight, 0, soilTop, SCREEN_W, SCREEN_H - soilTop);
  const forestHeight = forestBottom - forestTop;
  const blendStart = forestHeight - blendRows;
  d.ctx.drawImage(forest, 0, forestTop, SCREEN_W, blendStart, 0, 0, SCREEN_W, blendStart);
  // 幾何のドットは1:1のまま。土だけを1px行ごとに重ね、規則的な網目の帯を作らない。
  d.ctx.save();
  for (let row = blendStart; row < forestHeight; row++) {
    d.ctx.globalAlpha = (forestHeight - row) / (blendRows + 1);
    d.ctx.drawImage(forest, 0, forestTop + row, SCREEN_W, 1, 0, row, SCREEN_W, 1);
  }
  d.ctx.restore();
  d.ctx.save();
  d.ctx.clip(mudMask());
  d.ctx.globalAlpha = 0.8;
  d.ctx.drawImage(soil, 180, 40, 94, 42, 88, 144, 94, 42);
  d.ctx.globalAlpha = 0.1;
  d.rect(88, 144, 94, 42, "#453d2c");
  d.ctx.restore();
}
