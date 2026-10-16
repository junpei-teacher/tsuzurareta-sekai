import type { Display } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { StatusInst } from "../game/player.ts";
import type { StatusKind } from "../spell/book.ts";

/** 標準のウィンドウ枠 */
export function windowBox(d: Display, x: number, y: number, w: number, h: number, border = PAL.line): void {
  d.rect(x, y, w, h, PAL.panel);
  d.frame(x, y, w, h, border);
}

/** 横棒ゲージ */
export function bar(
  d: Display, x: number, y: number, w: number, h: number,
  ratio: number, color: string, back = "#241e1a",
): void {
  const r = Math.max(0, Math.min(1, ratio));
  d.rect(x, y, w, h, back);
  if (r > 0) d.rect(x, y, Math.max(1, Math.round(w * r)), h, color);
  d.frame(x - 1, y - 1, w + 2, h + 2, PAL.line);
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
    d.rect(cx, y, w, 13, "#2c241f");
    d.frame(cx, y, w, 13, PAL.line);
    d.text(text, cx + 3, y + 1, PAL.dim);
    cx += w + 3;
  }
}
