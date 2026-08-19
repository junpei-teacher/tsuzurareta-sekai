import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import type { Player } from "../game/player.ts";
import { authoredEntries, fragmentAt, fragmentCount } from "../ending/resolve.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { windowBox } from "../ui/hud.ts";

/**
 * 集めたもの（設計書 6.4）。
 *
 * **周回で積み上がるものを、初めて画面に出す場所である。**
 *
 * 呪文帳・断章・結末は最初から localStorage に貯まっていたが、
 * 見る手段がどこにも無かった。エンディングの最後に一行出るだけで、
 * タイトルへ戻れば消える。**貯まっていることを誰も知らないまま**だった。
 *
 * 見せ方は目録に寄せる。まだ読んでいないものも**欠番として並べる。**
 * 何番が空いているかが見えないと、集める気は起きない。
 * これは主人公の仕事（目録に書き写す）とも一致している。
 */

/** 一覧に出す行数 */
const ROWS = 7;

const TABS = ["断章", "結末", "呪文帳"] as const;

export class CollectionScene implements Scene {
  private tab = 0;
  private index = [0, 0, 0];
  private scroll = [0, 0, 0];
  // 読むための画面なので、説明のあとにフレーバーの一文も出す
  private readonly grimoire = new GrimoireView("read");

  constructor(
    private readonly player: Player,
    private readonly onExit: () => void,
  ) {}

  private get count(): number {
    return this.tab === 0 ? fragmentCount() : authoredEntries().length;
  }

  update(_dt: number, keys: string[]): void {
    for (const key of keys) this.handleKey(key);
  }

  private handleKey(key: string): void {
    if (key === "Escape") { sfx.play("cancel"); this.onExit(); return; }

    if (key === "ArrowLeft" || key === "ArrowRight") {
      this.tab = (this.tab + (key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
      sfx.play("move");
      return;
    }

    // 呪文帳の頁だけは既存の描画を丸ごと借りる。**同じものを二度作らない。**
    // 未解読の控えもそのまま並ぶ
    if (this.tab === 2) { this.grimoire.handle(key, this.player); return; }

    const n = Math.max(1, this.count);
    const i = this.tab;
    if (key === "ArrowUp") { this.index[i] = (this.index[i]! + n - 1) % n; sfx.play("move"); }
    if (key === "ArrowDown") { this.index[i] = (this.index[i]! + 1) % n; sfx.play("move"); }
    const idx = this.index[i]!;
    if (idx < this.scroll[i]!) this.scroll[i] = idx;
    if (idx >= this.scroll[i]! + ROWS) this.scroll[i] = idx - ROWS + 1;
  }

  render(d: Display): void {
    const p = this.player;
    d.clear("#0b0908");

    // 見出しと頁の耳
    d.text("集めたもの", 24, 12, PAL.accent);
    let tx = 180;
    TABS.forEach((name, i) => {
      const on = i === this.tab;
      if (on) d.rect(tx - 6, 10, d.measure(name) + 12, 15, "#2c241f");
      d.text(name, tx, 12, on ? PAL.ink : PAL.dim);
      tx += d.measure(name) + 24;
    });
    d.textRight("← → 頁　ESC もどる", SCREEN_W - 20, 12, PAL.hint);

    if (this.tab === 2) {
      this.grimoire.render(d, 16, 30, SCREEN_W - 32, 180, p);
      d.textRight("↑↓ 選択", SCREEN_W - 20, 216, PAL.hint);
      return;
    }

    if (this.tab === 0) this.renderFragments(d, p);
    else this.renderEndings(d, p);
  }

  private renderFragments(d: Display, p: Player): void {
    const total = fragmentCount();
    windowBox(d, 16, 30, SCREEN_W - 32, 108);
    d.text(`断章　${p.seenFragments.size} / ${total}`, 28, 38, PAL.accent);

    const i = this.index[0]!;
    const from = this.scroll[0]!;
    for (let r = 0; r < ROWS && from + r < total; r++) {
      const n = from + r;
      const y = 56 + r * 11;
      const seen = p.seenFragments.has(n);
      if (n === i) d.rect(24, y - 1, SCREEN_W - 48, 12, "#2c241f");
      d.text(n === i ? "▸" : " ", 26, y, PAL.accent);
      // 番号は読んでいなくても必ず読める明るさで出す。
      // **何番が空いているかが見えないと、集める気は起きない**
      d.text(String(n + 1).padStart(2, "0"), 40, y, PAL.dim);
      // 読んだものは一行目を題名にする。断章に題は無いので、最初の一行が題になる。
      // 未読は罫線だけ引く。**文字色に line を使わない**ための描き分けでもある
      if (seen) d.text(fragmentAt(n)[0] ?? "", 62, y, PAL.ink);
      else d.rect(62, y + 6, 120, 1, PAL.line);
    }
    if (total > ROWS) d.textRight(`${i + 1} / ${total}`, SCREEN_W - 30, 126, PAL.hint);

    // 本文
    windowBox(d, 16, 144, SCREEN_W - 32, 96);
    if (p.seenFragments.has(i)) {
      fragmentAt(i).forEach((line, k) => d.text(line, 30, 154 + k * 16, PAL.ink));
    } else {
      d.text("まだ、この頁は書かれていない。", 30, 154, PAL.dim);
      d.text("禁書に別の言葉を書けば、別の世界が残る。", 30, 170, PAL.dim);
    }
    d.textRight("↑↓ 選択", SCREEN_W - 20, 246, PAL.hint);
  }

  private renderEndings(d: Display, p: Player): void {
    const all = authoredEntries();
    windowBox(d, 16, 30, SCREEN_W - 32, 108);
    d.text(`結末　${p.seenEndings.size} / ${all.length}`, 28, 38, PAL.accent);

    const i = this.index[1]!;
    const from = this.scroll[1]!;
    for (let r = 0; r < ROWS && from + r < all.length; r++) {
      const n = from + r;
      const e = all[n]!;
      const y = 56 + r * 11;
      const seen = p.seenEndings.has(e.key);
      if (n === i) d.rect(24, y - 1, SCREEN_W - 48, 12, "#2c241f");
      d.text(n === i ? "▸" : " ", 26, y, PAL.accent);
      d.text(String(n + 1).padStart(2, "0"), 40, y, PAL.dim);
      if (seen) d.text(e.ending.title, 62, y, PAL.ink);
      else d.rect(62, y + 6, 120, 1, PAL.line);
      // **到達した結末だけ、書き込んだ語を見せる。**
      // 未到達のものに鍵を出すと、探す遊びが総当たりに変わる
      if (seen) {
        d.textRight(e.key === "" ? "（空欄）" : e.key.split("|").join("　"),
          SCREEN_W - 30, y, PAL.dim);
      }
    }
    if (all.length > ROWS) d.textRight(`${i + 1} / ${all.length}`, SCREEN_W - 30, 126, PAL.hint);

    windowBox(d, 16, 144, SCREEN_W - 32, 96);
    const sel = all[i];
    if (sel && p.seenEndings.has(sel.key)) {
      sel.ending.lines.slice(0, 5).forEach((line, k) => d.text(line, 30, 154 + k * 16, PAL.ink));
    } else {
      d.text("まだ、この結末には行き着いていない。", 30, 154, PAL.dim);
      d.text("白紙に何を書くかで、残る世界が変わる。", 30, 170, PAL.dim);
    }
    d.textRight("↑↓ 選択", SCREEN_W - 20, 246, PAL.hint);
  }
}
