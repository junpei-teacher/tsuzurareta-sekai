import type { Display } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Player, StatusInst } from "../game/player.ts";
import type { StatusKind } from "../spell/book.ts";

/** 標準のウィンドウ枠 */
export function windowBox(
  d: Display, x: number, y: number, w: number, h: number, border: string = PAL.line,
): void {
  // 影 → 外枠 → 面 → 内側の反射。角丸にせず、ドットのまま面の階層を増やす。
  d.rect(x + 2, y + 3, w, h, PAL.shadow);
  d.rect(x, y, w, h, PAL.panel);
  d.frame(x, y, w, h, border);
  if (w > 4 && h > 4) {
    d.rect(x + 2, y + 2, w - 4, 1, PAL.panelAlt);
    d.rect(x + 2, y + h - 2, w - 4, 1, PAL.shadow);
    // 十年後のUIは面の深さを1px増やす。角飾りを大きくせず、節だけを残す。
    d.rect(x + 7, y + 1, Math.min(34, w - 14), 1, border);
    d.rect(x + 1, y + 6, 1, Math.min(18, h - 12), PAL.panelAlt);
    d.rect(x + w - 3, y + h - 3, 2, 2, PAL.shadow);
  }
}

/** タイトル、メニュー、戦闘で共用する選択面。 */
export function selectionRow(
  d: Display, x: number, y: number, w: number, h: number, accent = PAL.accentCool,
): void {
  d.rect(x + 2, y + 2, w, h, PAL.shadow);
  d.rect(x, y, w, h, PAL.selection);
  d.rect(x, y, 2, h, accent);
  if (w > 7) d.rect(x + 4, y + 1, w - 7, 1, PAL.panelAlt);
  d.rect(x + w - 3, y + h - 3, 2, 2, PAL.accent);
}

/** 横棒ゲージ */
export function bar(
  d: Display, x: number, y: number, w: number, h: number,
  ratio: number, color: string, back = PAL.shadow,
): void {
  const r = Math.max(0, Math.min(1, ratio));
  d.rect(x, y, w, h, back);
  if (r > 0) {
    const fill = Math.max(1, Math.round(w * r));
    d.rect(x, y, fill, h, color);
    // 上辺の1pxだけ明るく見せる。色は変えず透明度で質感を足す。
    d.ctx.save();
    d.ctx.globalAlpha = 0.22;
    d.rect(x, y, fill, 1, PAL.ink);
    d.ctx.restore();
  }
  d.frame(x - 1, y - 1, w + 2, h + 2, PAL.line);
}

/** 第一章の導入戦後にだけ出す、探索用の小型成長・HP／MP表示。 */
export function explorationHud(d: Display, player: Player): void {
  const x = 16, y = 12, w = 140, h = 55;
  windowBox(d, x, y, w, h);
  d.rect(x + 7, y + 6, 30, 12, PAL.panelAlt);
  d.rect(x + 7, y + 6, 2, 12, PAL.accentCool);
  d.text(`LV ${player.level}`, x + 12, y + 7, PAL.ink, 8);
  d.textRight(`攻撃 ${player.attack}`, x + w - 8, y + 6, PAL.dim, 9);
  d.rect(x + 7, y + 19, w - 14, 1, PAL.line);
  d.text("HP", x + 8, y + 22, PAL.dim, 9);
  bar(d, x + 28, y + 23, 72, 4, player.hp / player.maxHp, PAL.hp);
  d.textRight(`${player.hp}/${player.maxHp}`, x + w - 7, y + 19, PAL.ink, 9);
  d.text("MP", x + 8, y + 38, PAL.dim, 9);
  bar(d, x + 28, y + 39, 72, 4, player.mp / player.maxMp, PAL.mp);
  d.textRight(`${player.mp}/${player.maxMp}`, x + w - 7, y + 35, PAL.ink, 9);
}

const STATUS_LABEL: Record<StatusKind, string> = {
  DEF_DOWN: "防↓", SLOW: "鈍", SILENCE: "黙", BURN: "燃", FREEZE: "凍",
  POWER_UP: "力↑", MP_HALF: "墨半", REVEAL: "眼", FLEE_UP: "遁", SHIELD: "影",
  ACC_DOWN: "盲", CLEANSE: "浄", GUARD: "壁",
};

/** 状態異常を小さなタグで並べる */
export function statusTags(d: Display, x: number, y: number, list: StatusInst[]): void {
  let cx = x;
  for (const s of list) {
    const label = STATUS_LABEL[s.kind] ?? "?";
    const text = `${label}${s.turns < 90 ? s.turns : ""}`;
    const w = Math.ceil(d.measure(text)) + 6;
    d.rect(cx, y, w, 13, PAL.panelAlt);
    d.frame(cx, y, w, 13, PAL.line);
    d.text(text, cx + 3, y + 1, PAL.dim);
    cx += w + 3;
  }
}
