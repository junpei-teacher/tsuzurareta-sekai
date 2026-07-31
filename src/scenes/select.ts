import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import type { Player } from "../game/player.ts";
import { ENEMIES, type EnemyDef } from "../battle/model.ts";
import { bar, windowBox } from "../ui/hud.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { LEVELS } from "../game/player.ts";

/**
 * Phase 3 の動作確認用メニュー。
 * 製品には残さない。Phase 4 でフィールドに置き換わる。
 */
const EXTRAS = ["HP/MP/道具を全回復", "呪文帳を見る", "呪文帳を初期化", "詠唱テストベッドへ"];

export class SelectScene implements Scene {
  private index = 0;
  private caret = 0;
  private viewing = false;
  private readonly grimoire = new GrimoireView();

  constructor(
    private readonly player: Player,
    private readonly onFight: (e: EnemyDef) => void,
    private readonly onTestbed: () => void,
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
      case 0:
        this.player.restore();
        this.player.items = { ink: 3, drop: 1 };
        break;
      case 1:
        this.viewing = true;
        this.grimoire.reset();
        break;
      case 2:
        this.player.grimoire.clear();
        this.player.unspoken.clear();
        this.player.grimoire.set(20, "ROZHA"); // 熾火だけは最初から
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
      d.textRight("↑↓ 選択　ESC とじる", 452, 216, PAL.line);
      return;
    }

    windowBox(d, 16, 26, 250, 180);
    ENEMIES.forEach((e, i) => {
      const y = 32 + i * 13;
      const on = i === this.index;
      if (on) d.text("▸", 26, y, PAL.accent);
      d.text(e.name, 40, y, on ? PAL.ink : PAL.dim);
      d.textRight(`ch${e.chapter}`, 256, y, PAL.line);
    });

    EXTRAS.forEach((label, k) => {
      const i = ENEMIES.length + k;
      const y = 32 + i * 13 + 8;
      const on = i === this.index;
      if (on) d.text("▸", 26, y, PAL.accent);
      d.text(label, 40, y, on ? PAL.ink : PAL.line);
    });

    // 選択中の敵の説明
    windowBox(d, 274, 26, 190, 180);
    const sel = ENEMIES[this.index];
    if (sel) {
      d.text(sel.name, 284, 34, PAL.ink);
      d.text(`HP ${sel.hp}　攻 ${sel.atk}　防 ${sel.def}`, 284, 52, PAL.dim);
      if (sel.weak.length) d.text(`弱点 ${sel.weak.join("・")}`, 284, 68, "#c8912f");
      if (sel.resist.length) d.text(`耐性 ${sel.resist.join("・")}`, 284, 82, PAL.dim);
      if (sel.immune.length) d.text(`無効 ${sel.immune.join("・")}`, 284, 96, PAL.danger);
      if (sel.skill) d.text(`技 ${sel.skill.name}`, 284, 112, PAL.dim);
      this.wrap(sel.desc, 14).forEach((line, i) => d.text(line, 284, 134 + i * 14, PAL.line));
    }

    // プレイヤー状態
    const p = this.player;
    windowBox(d, 16, 212, 448, 46);
    d.text(`Lv ${p.level}`, 28, 218, PAL.ink);
    d.text("HP", 70, 218, PAL.dim);
    bar(d, 92, 219, 110, 8, p.hp / p.maxHp, "#a8563f");
    d.text(`${p.hp}/${p.maxHp}`, 208, 218, PAL.dim);
    d.text("MP", 270, 218, PAL.dim);
    bar(d, 292, 219, 110, 8, p.mp / p.maxMp, "#3f6fa8");
    d.text(`${p.mp}/${p.maxMp}`, 408, 218, PAL.dim);
    d.text(
      `呪文帳 ${p.grimoire.size} 種　未詠唱 ${p.unspoken.size}　` +
      `インク壺 ${p.items.ink}　魔力の雫 ${p.items.drop}`,
      28, 238, PAL.dim,
    );
    d.textRight(`最大 Lv${LEVELS.length - 1}`, 452, 238, PAL.line);
  }

  /** 日本語の素朴な折り返し */
  private wrap(text: string, per: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += per) out.push(text.slice(i, i + per));
    return out;
  }
}
