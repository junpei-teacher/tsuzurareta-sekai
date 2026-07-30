import { Display, SCREEN_W } from "../core/display.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { CastFx } from "../fx/castFx.ts";
import type { Player } from "../game/player.ts";
import { Battle, spawn, type EnemyDef } from "../battle/model.ts";
import { TextField } from "../ui/textField.ts";
import { bar, statusTags, windowBox } from "../ui/hud.ts";

const COMMANDS = ["詠唱", "道具", "逃げる"] as const;

/**
 * 戦闘画面（手順書 Phase 3）。
 * グラフィックは矩形のまま。アセットは Phase 7 まで入れない。
 */
export class BattleScene implements Scene {
  private readonly battle: Battle;
  private readonly player: Player;
  private readonly onExit: () => void;

  private readonly fx = new CastFx();
  private readonly field = new TextField();

  private cmd = 0;
  private item = 0;
  private caret = 0;
  private hitFlash = 0;
  private prevEnemyHp: number;

  constructor(player: Player, enemyDef: EnemyDef, onExit: () => void) {
    this.player = player;
    this.battle = new Battle(player, spawn(enemyDef));
    this.onExit = onExit;
    this.prevEnemyHp = this.battle.enemy.hp;
    this.syncDictionary();
  }

  /** サジェスト辞書を呪文帳と同期する。詠唱妨害中は空にする */
  private syncDictionary(): void {
    this.field.setDictionary(
      this.battle.suggestionsBlocked ? [] : this.player.knownWords(),
    );
  }

  update(dt: number, keys: string[]): void {
    this.caret += dt;
    this.fx.update(dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);

    if (this.battle.enemy.hp < this.prevEnemyHp) this.hitFlash = 1;
    this.prevEnemyHp = this.battle.enemy.hp;

    for (const key of keys) this.handleKey(key);
  }

  private handleKey(key: string): void {
    const b = this.battle;

    switch (b.phase) {
      case "MESSAGE":
        if (key === "Enter" || key === " ") {
          b.advance();
          this.syncDictionary();
        }
        return;

      case "COMMAND":
        if (key === "ArrowUp") this.cmd = (this.cmd + COMMANDS.length - 1) % COMMANDS.length;
        if (key === "ArrowDown") this.cmd = (this.cmd + 1) % COMMANDS.length;
        if (key === "Enter" || key === " ") {
          if (this.cmd === 0) {
            b.phase = "CASTING";
            this.field.clear();
            this.syncDictionary();
          } else if (this.cmd === 1) {
            b.phase = "ITEM";
            this.item = 0;
          } else {
            b.flee();
          }
        }
        return;

      case "CASTING": {
        if (key === "Escape" && this.field.value.length === 0) {
          b.phase = "COMMAND";
          return;
        }
        const submitted = this.field.feed(key);
        if (submitted === null) return;
        if (submitted.trim().length === 0) return; // 空Enterは無視
        const report = b.cast(submitted);
        if (report.kind === "CAST") {
          this.fx.play(report.resolution.tier, report.word, report.resolution.hash, !report.firstTime);
        } else if (report.kind === "LOCKED") {
          this.fx.playLocked(report.resolution.tier, report.word, report.resolution.hash);
        } else if (report.kind === "DUD") {
          this.fx.play("DUD", report.word, report.resolution.hash);
        }
        this.syncDictionary();
        return;
      }

      case "ITEM": {
        const max = 3;
        if (key === "ArrowUp") this.item = (this.item + max - 1) % max;
        if (key === "ArrowDown") this.item = (this.item + 1) % max;
        if (key === "Escape") b.phase = "COMMAND";
        if (key === "Enter" || key === " ") {
          if (this.item === 0) b.useItem("ink");
          else if (this.item === 1) b.useItem("drop");
          else b.phase = "COMMAND";
        }
        return;
      }

      case "WIN":
      case "LOSE":
      case "FLED":
        if (key === "Enter" || key === " ") this.onExit();
        return;
    }
  }

  // ── 描画 ──────────────────────────────────

  render(d: Display): void {
    d.clear();
    const sh = this.fx.shake;
    d.ctx.save();
    d.ctx.translate(sh.x, sh.y);
    this.renderEnemy(d);
    this.renderWindow(d);
    this.renderPlayer(d);
    d.ctx.restore();

    this.fx.renderBehind(d);
    this.fx.renderFront(d);

    if (this.battle.phase === "WIN" || this.battle.phase === "LOSE" || this.battle.phase === "FLED") {
      this.renderResult(d);
    }
  }

  private renderEnemy(d: Display): void {
    const e = this.battle.enemy;
    const name = e.def.name;
    const nameW = d.measure(name);
    d.text(name, Math.round((SCREEN_W - nameW) / 2), 10, PAL.ink);

    bar(d, 150, 26, 180, 6, e.hp / e.maxHp, e.hp / e.maxHp > 0.3 ? "#a8563f" : "#d0402f");
    d.textRight(`${e.hp} / ${e.maxHp}`, 330, 36, PAL.dim);

    if (this.battle.revealed) {
      const parts: string[] = [];
      if (e.def.weak.length) parts.push(`弱点 ${e.def.weak.join("・")}`);
      if (e.def.resist.length) parts.push(`耐性 ${e.def.resist.join("・")}`);
      if (e.def.immune.length) parts.push(`無効 ${e.def.immune.join("・")}`);
      if (parts.length) d.text(parts.join("　"), 150, 36, PAL.accent);
    }

    // 敵本体（Phase 7 までは矩形）
    const { w, h, color } = e.def.sprite;
    const x = Math.round((SCREEN_W - w) / 2);
    const y = 118 - h;
    d.rect(x, y, w, h, this.hitFlash > 0.4 ? "#e8dcc0" : color);
    d.frame(x, y, w, h, PAL.line);

    statusTags(d, 150, 122, e.statuses);
  }

  private renderWindow(d: Display): void {
    const b = this.battle;
    windowBox(d, 16, 136, 448, 68);

    switch (b.phase) {
      case "MESSAGE": {
        const page = b.messages.slice(0, Battle.PAGE);
        page.forEach((m, i) => d.text(m, 30, 148 + i * 16, PAL.ink));
        if (b.messages.length > Battle.PAGE) {
          const blink = Math.floor(this.caret * 3) % 2 === 0;
          if (blink) d.text("▼", 446, 188, PAL.accent);
        } else {
          d.textRight("ENTER", 452, 188, PAL.line);
        }
        break;
      }

      case "COMMAND":
        COMMANDS.forEach((c, i) => {
          const y = 148 + i * 16;
          if (i === this.cmd) d.text("▸", 30, y, PAL.accent);
          d.text(c, 44, y, i === this.cmd ? PAL.ink : PAL.dim);
        });
        d.text("↑↓ 選択　ENTER 決定", 200, 148, PAL.line);
        break;

      case "CASTING": {
        const cursorOn = Math.floor(this.caret * 2) % 2 === 0;
        d.text(`> ${this.field.value}${cursorOn ? "_" : ""}`, 30, 146, PAL.ink);

        if (b.suggestionsBlocked) {
          d.text("覚えていたはずの綴りが、思い出せない。", 30, 168, PAL.danger);
        } else if (this.field.suggestions.length > 0) {
          this.field.suggestions.forEach((s, i) => {
            const y = 164 + i * 13;
            const on = i === this.field.cursor;
            if (on) d.rect(28, y - 1, 200, 13, "#2c241f");
            d.text(s, 32, y, on ? PAL.accent : PAL.dim);
          });
          d.text("TAB 候補", 380, 164, PAL.line);
        } else if (this.field.value.length > 0) {
          d.text("（呪文帳にない言葉）", 30, 168, PAL.line);
        }
        d.textRight("ESC もどる", 452, 188, PAL.line);
        break;
      }

      case "ITEM": {
        const rows = [
          `インク壺　　×${this.player.items.ink}　　MP+10`,
          `魔力の雫　　×${this.player.items.drop}　　MP+30`,
          "もどる",
        ];
        rows.forEach((r, i) => {
          const y = 148 + i * 16;
          if (i === this.item) d.text("▸", 30, y, PAL.accent);
          d.text(r, 44, y, i === this.item ? PAL.ink : PAL.dim);
        });
        break;
      }

      default:
        break;
    }
  }

  private renderPlayer(d: Display): void {
    const p = this.player;
    windowBox(d, 16, 210, 448, 52);

    d.text(`${p.name}　Lv ${p.level}`, 28, 216, PAL.ink);
    d.textRight(`呪文帳 ${p.grimoire.size} 種`, 452, 216, PAL.dim);

    d.text("HP", 28, 230, PAL.dim);
    bar(d, 50, 231, 130, 8, p.hp / p.maxHp, "#a8563f");
    d.text(`${p.hp}/${p.maxHp}`, 186, 230, PAL.dim);

    d.text("MP", 250, 230, PAL.dim);
    bar(d, 272, 231, 130, 8, p.mp / p.maxMp, "#3f6fa8");
    d.text(`${p.mp}/${p.maxMp}`, 408, 230, PAL.dim);

    statusTags(d, 28, 244, p.statuses);
  }

  private renderResult(d: Display): void {
    const label =
      this.battle.phase === "WIN" ? "勝利" :
      this.battle.phase === "LOSE" ? "目の前が、白くなった" : "逃げ切った";
    const col = this.battle.phase === "LOSE" ? TIER_COLOR.DUD : PAL.accent;
    d.ctx.globalAlpha = 0.7;
    d.rect(0, 96, SCREEN_W, 46, "#0a0807");
    d.ctx.globalAlpha = 1;
    const w = d.measure(label, 24);
    d.text(label, Math.round((SCREEN_W - w) / 2), 104, col, 24);
    d.textRight("ENTER", 452, 128, PAL.dim);
  }
}
