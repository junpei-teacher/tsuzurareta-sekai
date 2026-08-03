import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import type { Player } from "../game/player.ts";
import { ENEMIES, type EnemyDef } from "../battle/model.ts";
import { bar, windowBox } from "../ui/hud.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { ITEM_NAME, LEVELS } from "../game/player.ts";
import { clearProgress } from "../game/save.ts";

/**
 * Phase 3 の動作確認用メニュー。
 * 製品には残さない。Phase 4 でフィールドに置き換わる。
 */
const EXTRAS = [
  "第1章を歩く　静かな書庫",
  "第2章を歩く　炎上",
  "第3章を歩く　地下",
  "禁書を開く　終章",
  "HP/MP/道具を全回復",
  "呪文帳を見る",
  "呪文帳を初期化（セーブも消す）",
  "詠唱テストベッドへ",
];

/** 一覧の1行目と行間。17行が窓に収まる値 */
const ROW_Y0 = 27;
const ROW_H = 11;

export class SelectScene implements Scene {
  private index = 0;
  private caret = 0;
  private viewing = false;
  private readonly grimoire = new GrimoireView();

  constructor(
    private readonly player: Player,
    private readonly onFight: (e: EnemyDef) => void,
    private readonly onTestbed: () => void,
    private readonly onField: (chapter: number) => void,
    private readonly onVault: () => void,
  ) {}

  private get rows(): number {
    return ENEMIES.length + EXTRAS.length;
  }

  update(dt: number, keys: string[]): void {
    this.caret += dt;
    for (const key of keys) {
      if (this.viewing) {
        if (this.grimoire.handle(key, this.player)) this.viewing = false;
        continue;
      }
      if (key === "ArrowUp") this.index = (this.index + this.rows - 1) % this.rows;
      if (key === "ArrowDown") this.index = (this.index + 1) % this.rows;
      if (key === "ArrowLeft") this.player.setLevel(this.player.level - 1);
      if (key === "ArrowRight") this.player.setLevel(this.player.level + 1);
      if (key === "Enter" || key === " ") this.choose();
    }
  }

  private choose(): void {
    if (this.index < ENEMIES.length) {
      this.onFight(ENEMIES[this.index]!);
      return;
    }
    switch (this.index - ENEMIES.length) {
      case 0: this.onField(1); break;
      case 1: this.onField(2); break;
      case 2: this.onField(3); break;
      case 3: this.onVault(); break;
      case 4:
        this.player.restore();
        this.player.items = { ink: 5, drop: 3 };
        break;
      case 5:
        this.viewing = true;
        this.grimoire.reset();
        break;
      case 6:
        this.player.grimoire.clear();
        this.player.unspoken.clear();
        this.player.seenEndings.clear();
        this.player.seenFragments.clear();
        this.player.grimoire.set(20, "ROZHA"); // 熾火だけは最初から
        clearProgress();
        break;
      default:
        this.onTestbed();
    }
  }

  render(d: Display): void {
    d.clear();
    d.text("PHASE 3 ／ 戦闘テスト", 16, 8, PAL.accent);
    d.textRight("←→ でレベル変更", SCREEN_W - 16, 8, PAL.dim);

    if (this.viewing) {
      this.grimoire.render(d, 16, 26, 448, 184, this.player);
      d.textRight("↑↓ 選択　ESC とじる", 452, 216, PAL.hint);
      return;
    }

    // 敵9種＋その他8項目＝17行。13px間隔だと窓を40pxはみ出していた。
    // 行間を11に詰め、窓を上下いっぱい（22〜236）に伸ばして収める
    windowBox(d, 16, 22, 250, 214);
    ENEMIES.forEach((e, i) => {
      const y = ROW_Y0 + i * ROW_H;
      const on = i === this.index;
      if (on) d.text("▸", 26, y, PAL.accent);
      d.text(e.name, 40, y, on ? PAL.ink : PAL.dim);
      d.textRight(`ch${e.chapter}`, 256, y, PAL.hint);
    });

    EXTRAS.forEach((label, k) => {
      const i = ENEMIES.length + k;
      const y = ROW_Y0 + ENEMIES.length * ROW_H + 10 + k * ROW_H;
      const on = i === this.index;
      if (on) d.text("▸", 26, y, PAL.accent);
      d.text(label, 40, y, on ? PAL.ink : PAL.dim);
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
    d.text(`Lv ${p.level}`, 28, 242, PAL.ink);
    d.text("HP", 70, 242, PAL.dim);
    bar(d, 92, 243, 90, 8, p.hp / p.maxHp, "#a8563f");
    d.text(`${p.hp}/${p.maxHp}`, 188, 242, PAL.dim);
    d.text("MP", 262, 242, PAL.dim);
    bar(d, 284, 243, 90, 8, p.mp / p.maxMp, "#3f6fa8");
    d.text(`${p.mp}/${p.maxMp}`, 380, 242, PAL.dim);
    d.text(
      `呪文帳 ${p.grimoire.size} 種　未詠唱 ${p.unspoken.size}　` +
      `${ITEM_NAME.ink} ${p.items.ink}　${ITEM_NAME.drop} ${p.items.drop}`,
      28, 254, PAL.dim,
    );
    d.textRight(`最大 Lv${LEVELS.length - 1}`, 452, 254, PAL.hint);
  }

  /** 日本語の素朴な折り返し */
  private wrap(text: string, per: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += per) out.push(text.slice(i, i + per));
    return out;
  }
}
