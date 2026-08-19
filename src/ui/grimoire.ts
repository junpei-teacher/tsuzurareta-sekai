import type { Display } from "../core/display.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import type { Player } from "../game/player.ts";
import { allSpells, ELEMENT_JP, spellById, spellSummary } from "../spell/book.ts";
import { windowBox } from "./hud.ts";

const ROWS = 8;

/** この世界に在る呪文の総数。呪文帳の見出しに出す */
const TOTAL = allSpells().length;

/** 一覧の1行。呪文か、まだ埋まっていない欠けた綴りか */
type Row =
  | { kind: "spell"; id: number }
  | { kind: "riddle"; id: number; mask: string; place: string };

/**
 * 呪文帳。戦闘中にもセレクト画面にも埋め込める。
 *
 * 記録されるのは spellId → **プレイヤーが実際に打った文字列**。
 * 巻物の呪文は canonical、発掘した呪文は自分が掘り当てた綴りが載る。
 *
 * 末尾に**欠けた綴りの控え**が並ぶ。これは呪文ではなく、読めたところの写しである。
 * 主人公の仕事は書き写すことなので、読めない字も含めてここに載る。
 *
 * 「詠唱妨害」を受けているあいだは開けない（設計書 4.3.1）。
 * 手元の記憶だけが頼りになる。
 */
export class GrimoireView {
  private index = 0;
  private scroll = 0;

  /**
   * 下段に何を出すか。
   *
   * `use`  … 使うための情報（帯・属性・威力・効果）。戦闘とフィールド。
   * `read` … それに加えてフレーバーの一文。集めたもの（読むための画面）。
   *
   * 戦闘中に呪文帳を開く人が知りたいのは**何属性でどれくらい強いか**であって、
   * 「ミラが最初に教えてくれた言葉。」ではない。
   * かといって57本の一文を捨てるのも惜しいので、読む場所を分けた。
   */
  constructor(private readonly mode: "use" | "read" = "use") {}

  reset(): void {
    this.index = 0;
    this.scroll = 0;
  }

  /** 呪文 → まだ埋まっていない欠けた綴り、の順に並べる */
  private rows(player: Player): Row[] {
    const spells: Row[] = [...player.grimoire.keys()]
      .sort((a, b) => a - b)
      .map((id) => ({ kind: "spell", id }));
    // 埋まったものは上の呪文欄に移っているので、控えからは落とす
    const riddles: Row[] = [...player.riddles.entries()]
      .filter(([id]) => !player.grimoire.has(id))
      .map(([id, r]) => ({ kind: "riddle", id, mask: r.mask, place: r.place }));
    return [...spells, ...riddles];
  }

  /** @returns 閉じる要求があれば true */
  handle(key: string, player: Player): boolean {
    const n = Math.max(1, this.rows(player).length);
    if (key === "ArrowUp") this.index = (this.index + n - 1) % n;
    if (key === "ArrowDown") this.index = (this.index + 1) % n;
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + ROWS) this.scroll = this.index - ROWS + 1;
    return key === "Escape" || key === "Enter" || key === " ";
  }

  render(d: Display, x: number, y: number, w: number, h: number, player: Player): void {
    windowBox(d, x, y, w, h);

    const rows = this.rows(player);
    // **総数を出す。** 何種あるのか分からないと、増えたことに手応えが出ない。
    // このゲームで積み上がるのは呪文帳だけである（設計書 5.4）
    d.text(`呪文帳　${player.grimoire.size} / ${TOTAL} 種`, x + 12, y + 8, PAL.accent);
    if (player.unspoken.size > 0) {
      d.textRight(`未詠唱 ${player.unspoken.size}`, x + w - 12, y + 8, PAL.danger);
    }

    if (rows.length === 0) {
      d.text("まだ、何も知らない。", x + 12, y + 30, PAL.dim);
      return;
    }
    if (this.index >= rows.length) this.index = rows.length - 1;

    const view = rows.slice(this.scroll, this.scroll + ROWS);
    view.forEach((row, i) => {
      const ry = y + 26 + i * 15;
      const on = this.scroll + i === this.index;
      if (on) d.rect(x + 8, ry - 2, w - 16, 15, "#2c241f");
      d.text(on ? "▸" : " ", x + 10, ry, PAL.accent);

      if (row.kind === "riddle") {
        // 名前も属性もMPも出さない。**読めていないのだから、何も分からない**。
        // ただし綴りそのものは本文の明るさで出す。ここを読ませるための行である
        d.text(row.mask, x + 24, ry, PAL.ink);
        // どこで見た紙かを添える。綴りだけ並んでいても、何の控えか思い出せない
        if (row.place) d.text(row.place, x + 140, ry, PAL.dim);
        d.textRight("未解読", x + w - 14, ry, PAL.accent);
        return;
      }

      const sp = spellById(row.id);
      if (!sp) return;
      const unspoken = player.unspoken.has(row.id);
      const word = player.grimoire.get(row.id) ?? "";
      d.text(word, x + 24, ry, unspoken ? PAL.dim : PAL.ink);
      d.text(sp.name, x + 108, ry, TIER_COLOR[sp.tier]);
      // 属性は日本語一字。FIRE/ICE はともかく NAME/NONE は英語では通じない
      d.text(ELEMENT_JP[sp.element], x + 196, ry, PAL.dim);
      if (sp.power > 0) d.text(`威${sp.power}`, x + 218, ry, PAL.dim);
      d.textRight(unspoken ? "未詠唱" : `MP${sp.mp}`, x + w - 14, ry, unspoken ? PAL.danger : PAL.dim);
    });

    // スクロール位置
    if (rows.length > ROWS) {
      d.textRight(`${this.index + 1} / ${rows.length}`, x + w - 14, y + h - 30, PAL.hint);
    }

    // 選択中の行の説明
    const sel = rows[this.index];
    const twoLines = this.mode === "read";
    const top = y + h - (twoLines ? 40 : 24);
    d.rect(x + 8, top, w - 16, 1, PAL.line);
    if (sel?.kind === "riddle") {
      d.text("読めなかった字がある。埋めるなら、詠唱の欄で。", x + 12, top + 6, PAL.dim);
      return;
    }
    const sp = spellById(sel?.id ?? -1);
    if (!sp) return;
    d.text(spellSummary(sp), x + 12, top + 6, PAL.ink);
    if (twoLines) d.text(sp.flavor, x + 12, top + 22, PAL.dim);
  }
}
