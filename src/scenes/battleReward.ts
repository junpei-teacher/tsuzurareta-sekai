import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import type { LevelUpNotice } from "../game/player.ts";
import type { WeaponDef } from "../game/weapons.ts";
import { windowBox } from "../ui/hud.ts";

export type BattleReward = {
  xp: number;
  level: number;
  currentXp: number;
  xpToNext: number | null;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  levelUps: LevelUpNotice[];
  weapon: WeaponDef | null;
};

/** 戦闘結果と成長を一度だけ噛みしめる、小さなリザルト画面。 */
export class BattleRewardScene implements Scene {
  private clock = 0;

  constructor(
    private readonly reward: BattleReward,
    private readonly onDone: () => void,
  ) {}

  update(dt: number, keys: string[]): void {
    this.clock += dt;
    if (!keys.some((key) => key === "Enter" || key === " ")) return;
    sfx.play("confirm");
    this.onDone();
  }

  render(d: Display): void {
    d.clear("#071411");
    const glow = d.ctx.createRadialGradient(240, 118, 12, 240, 118, 210);
    glow.addColorStop(0, "rgba(118,216,193,0.18)");
    glow.addColorStop(1, "rgba(3,9,8,0)");
    d.ctx.fillStyle = glow;
    d.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    const x = 68, y = 28, w = 344, h = 214;
    windowBox(d, x, y, w, h, PAL.accentCool);
    d.text("戦いのあと", x + 20, y + 15, PAL.accentCool, 11);
    d.textRight(`経験値 ＋${this.reward.xp}`, x + w - 20, y + 15, PAL.accent, 11);
    d.rect(x + 18, y + 38, w - 36, 1, PAL.line);

    let row = y + 54;
    const latest = this.reward.levelUps.at(-1);
    if (latest) {
      const flash = Math.floor(this.clock * 3) % 2 === 0;
      d.text(`LEVEL ${latest.level}`, x + 24, row, flash ? PAL.accent : PAL.ink, 20);
      row += 28;
      d.text(`最大HP ＋${latest.hpGain}　最大MP ＋${latest.mpGain}　攻撃 ＋${latest.attackGain}`, x + 24, row, PAL.ink, 10);
      row += 24;
    } else {
      d.text(`LEVEL ${this.reward.level}`, x + 24, row, PAL.ink, 16);
      row += 28;
    }

    if (this.reward.weapon) {
      d.rect(x + 18, row - 6, w - 36, 44, PAL.selection);
      d.text(`◆ ${this.reward.weapon.name} を手に入れた`, x + 26, row, PAL.accent, 11);
      d.text(`自動装備　攻撃 ＋${this.reward.weapon.attack}`, x + 45, row + 19, PAL.dim, 10);
      row += 54;
    }

    d.text(`HP ${this.reward.hp}/${this.reward.maxHp}`, x + 24, row, PAL.dim, 10);
    d.text(`MP ${this.reward.mp}/${this.reward.maxMp}`, x + 136, row, PAL.dim, 10);
    d.textRight(`攻撃 ${this.reward.attack}`, x + w - 24, row, PAL.ink, 10);
    row += 20;
    d.text(
      this.reward.xpToNext === null
        ? `経験値 ${this.reward.currentXp}　LEVEL MAX`
        : `経験値 ${this.reward.currentXp}　次まで ${this.reward.xpToNext}`,
      x + 24,
      row,
      PAL.dim,
      10,
    );
    d.textRight("ENTER　先へ", x + w - 18, y + h - 20, PAL.hint, 10);
  }
}
