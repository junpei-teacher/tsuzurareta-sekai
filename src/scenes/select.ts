import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import type { Player } from "../game/player.ts";
import { ENEMIES, type EnemyDef } from "../battle/model.ts";
import { bar, windowBox } from "../ui/hud.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { ITEM_NAME } from "../game/player.ts";
import { clearProgress } from "../game/save.ts";

/**
 * ためす。
 *
 * もとは Phase 3 の動作確認用メニューで、製品には残さないつもりだった。
 * **一度でも禁書に書いた人には開放する**ことにした（`src/scenes/title.ts`）。
 * 書庫のどこへでも行けて、どの相手とも戦える。通した人へのおまけである。
 *
 * ただし**セーブを消す項目だけは開発時にしか出さない。** 積み上がるのは
 * 呪文帳・断章・結末だけ（設計書 5.4）で、それを消す入口を、
 * 遊ぶ人が入る画面に置く理由がない。
 */

type Extra = {
  label: string;
  act: "ch1" | "ch2" | "ch3" | "vault" | "heal" | "grimoire" | "wipe" | "testbed";
};

/** 一覧の1行目と行間。17行が窓に収まる値 */
const ROW_Y0 = 27;
const ROW_H = 11;

export class SelectScene implements Scene {
  private index = 0;
  private caret = 0;
  private viewing = false;
  private readonly grimoire = new GrimoireView();
  private readonly extras: Extra[];

  constructor(
    private readonly player: Player,
    private readonly onFight: (e: EnemyDef) => void,
    private readonly onTestbed: () => void,
    private readonly onField: (chapter: number) => void,
    private readonly onVault: () => void,
    private readonly onBack: () => void,
  ) {
    this.extras = [
      { label: "第1章を歩く　静かな書庫", act: "ch1" },
      { label: "第2章を歩く　炎上", act: "ch2" },
      { label: "第3章を歩く　地下", act: "ch3" },
      { label: "禁書を開く　終章", act: "vault" },
      { label: "HP/MP/道具を全回復", act: "heal" },
      { label: "呪文帳を見る", act: "grimoire" },
      { label: "詠唱をためす", act: "testbed" },
    ];
    // **消す入口は開発時だけ。** 遊ぶ人の画面に置くものではない
    if (import.meta.env.DEV) {
      this.extras.push({ label: "呪文帳を初期化（セーブも消す）", act: "wipe" });
    }
  }

  private get rows(): number {
    return ENEMIES.length + this.extras.length;
  }

  update(dt: number, keys: string[]): void {
    this.caret += dt;
    for (const key of keys) {
      if (this.viewing) {
        if (this.grimoire.handle(key, this.player)) this.viewing = false;
        continue;
      }
      // **「ESC もどる」と見出しに書いてあるのに、戻れなかった。**
      // ここが起動時の入口だった頃の名残で、出口が要らなかった
      if (key === "Escape") { this.onBack(); return; }
      if (key === "ArrowUp") this.index = (this.index + this.rows - 1) % this.rows;
      if (key === "ArrowDown") this.index = (this.index + 1) % this.rows;
      if (key === "Enter" || key === " ") this.choose();
    }
  }

  private choose(): void {
    if (this.index < ENEMIES.length) {
      this.onFight(ENEMIES[this.index]!);
      return;
    }
    switch (this.extras[this.index - ENEMIES.length]?.act) {
      case "ch1": this.onField(1); break;
      case "ch2": this.onField(2); break;
      case "ch3": this.onField(3); break;
      case "vault": this.onVault(); break;
      case "heal":
        this.player.restore();
        this.player.items = { ink: 5, drop: 3 };
        break;
      case "grimoire":
        this.viewing = true;
        this.grimoire.reset();
        break;
      case "wipe":
        this.player.grimoire.clear();
        this.player.unspoken.clear();
        this.player.riddles.clear();
        this.player.seenEndings.clear();
        this.player.seenFragments.clear();
        this.player.grimoire.set(20, "ROZHA"); // 残り火だけは最初から
        clearProgress();
        break;
      default:
        this.onTestbed();
    }
  }

  render(d: Display): void {
    d.clear();
    d.text(
      import.meta.env.DEV ? "ためす（開発）" : "ためす　——　書庫のどこへでも",
      16, 8, PAL.accent,
    );
    d.textRight("ENTER 決定　ESC もどる", SCREEN_W - 16, 8, PAL.dim);

    if (this.viewing) {
      this.grimoire.render(d, 16, 26, 448, 184, this.player);
      d.textRight("↑↓ 選択　ESC とじる", 452, 216, PAL.hint);
      return;
    }

    // 敵10種＋その他7〜8項目。13px間隔だと窓を40pxはみ出していた。
    // 行間を11に詰め、窓を上下いっぱい（22〜236）に伸ばして収める
    windowBox(d, 16, 22, 250, 214);
    ENEMIES.forEach((e, i) => {
      const y = ROW_Y0 + i * ROW_H;
      const on = i === this.index;
      if (on) d.text("▸", 26, y, PAL.accent);
      d.text(e.name, 40, y, on ? PAL.ink : PAL.dim);
      d.textRight(`ch${e.chapter}`, 256, y, PAL.hint);
    });

    this.extras.forEach((extra, k) => {
      const i = ENEMIES.length + k;
      const y = ROW_Y0 + ENEMIES.length * ROW_H + 10 + k * ROW_H;
      const on = i === this.index;
      if (on) d.text("▸", 26, y, PAL.accent);
      d.text(extra.label, 40, y, on ? PAL.ink : PAL.dim);
    });

    // 選択中の敵の説明
    windowBox(d, 274, 22, 190, 214);
    const sel = ENEMIES[this.index];
    if (sel) {
      d.text(sel.name, 284, 30, PAL.ink);
      d.text(`HP ${sel.hp}　攻 ${sel.atk}　防 ${sel.def}`, 284, 48, PAL.dim);
      if (sel.weak.length) d.text(`弱点 ${sel.weak.join("・")}`, 284, 64, "#c8912f");
      if (sel.resist.length) d.text(`耐性 ${sel.resist.join("・")}`, 284, 78, PAL.dim);
      if (sel.immune.length) d.text(`無効 ${sel.immune.join("・")}`, 284, 92, PAL.danger);
      if (sel.skill) d.text(`技 ${sel.skill.name}`, 284, 108, PAL.dim);
      this.wrap(sel.desc, 14).forEach((line, i) => d.text(line, 284, 130 + i * 14, PAL.dim));
    }

    // プレイヤー状態
    const p = this.player;
    windowBox(d, 16, 238, 448, 30);
    d.text("HP", 28, 242, PAL.dim);
    bar(d, 50, 243, 90, 8, p.hp / p.maxHp, "#a8563f");
    d.text(`${p.hp}/${p.maxHp}`, 146, 242, PAL.dim);
    d.text("MP", 262, 242, PAL.dim);
    bar(d, 284, 243, 90, 8, p.mp / p.maxMp, "#3f6fa8");
    d.text(`${p.mp}/${p.maxMp}`, 380, 242, PAL.dim);
    d.text(
      `呪文帳 ${p.grimoire.size} 種　未詠唱 ${p.unspoken.size}　` +
      `${ITEM_NAME.ink} ${p.items.ink}　${ITEM_NAME.drop} ${p.items.drop}`,
      28, 254, PAL.dim,
    );
  }

  /** 日本語の素朴な折り返し */
  private wrap(text: string, per: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += per) out.push(text.slice(i, i + per));
    return out;
  }
}
