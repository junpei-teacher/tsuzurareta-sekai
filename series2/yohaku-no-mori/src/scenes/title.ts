import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { GAME_IDENTITY } from "../core/gameIdentity.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { THEMES } from "../core/theme.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
import type { Player } from "../game/player.ts";
import { allSpells } from "../spell/book.ts";
import { selectionRow, windowBox } from "../ui/hud.ts";

/**
 * 『余白の森』の入口。
 *
 * 第一作の「暗闇と下から差す火」を継がず、深い森の遠近、欠けた円環、
 * 木漏れ日の金と記憶の青緑で10年後を見せる。解像度と入力は変えない。
 */

type Item = { label: string; act: "new" | "continue" | "collection" | "debug" };

const FOREST = THEMES.forest;

const LIGHTS: Light[] = [
  { x: 98, y: 18, radius: 142, strength: 0.30, color: PAL.accentCool },
  { x: 390, y: 34, radius: 126, strength: 0.22, color: FOREST.foliageLight },
  { x: SCREEN_W / 2, y: 105, radius: 96, strength: 0.18, color: PAL.accent },
];

/** 毎回同じ場所から始まる、低速の胞子。乱数で画面をちらつかせない。 */
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  x: (31 + i * 83) % SCREEN_W,
  y: (19 + i * 47) % 218,
  speed: 2.2 + (i % 5) * 0.7,
  drift: 3 + (i % 4) * 1.4,
  phase: i * 1.73,
  bright: i % 6 === 0,
}));

export class TitleScene implements Scene {
  private index = 0;
  private t = 0;
  private readonly bloom = new BloomLayer();
  private readonly items: Item[];
  private confirmingNew = false;
  /** 0=戻る、1=はじめから。誤消去を避けて戻るを初期選択にする。 */
  private confirmIndex = 0;

  constructor(
    private readonly player: Player,
    private readonly onNew: () => void,
    private readonly onContinue: (() => void) | null,
    private readonly onCollection: () => void,
    private readonly onDebug?: () => void,
  ) {
    this.items = this.onContinue
      ? [
        { label: "つづける", act: "continue" },
        { label: "はじめから", act: "new" },
      ]
      : [{ label: "はじめる", act: "new" }];
    this.items.push({ label: "記憶の綴り", act: "collection" });

    if (import.meta.env.DEV && this.onDebug) {
      this.items.push({ label: "ためす（開発）", act: "debug" });
    }
  }

  update(dt: number, keys: string[]): void {
    this.t += dt;
    this.bloom.update(dt);
    if (this.confirmingNew) {
      for (const key of keys) {
        if (key === "Escape") {
          sfx.play("cancel");
          this.confirmingNew = false;
          return;
        }
        if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
          this.confirmIndex = this.confirmIndex === 0 ? 1 : 0;
          sfx.play("move");
        }
        if (key !== "Enter" && key !== " ") continue;
        if (this.confirmIndex === 0) {
          sfx.play("cancel");
          this.confirmingNew = false;
        } else {
          sfx.play("confirm");
          this.onNew();
        }
        return;
      }
      return;
    }

    for (const key of keys) {
      if (key === "ArrowUp") {
        this.index = (this.index + this.items.length - 1) % this.items.length;
        sfx.play("move");
      }
      if (key === "ArrowDown") {
        this.index = (this.index + 1) % this.items.length;
        sfx.play("move");
      }
      if (key !== "Enter" && key !== " ") continue;
      sfx.play("confirm");
      const act = this.items[this.index]!.act;
      if (act === "new") {
        if (this.onContinue) {
          this.confirmingNew = true;
          this.confirmIndex = 0;
        } else this.onNew();
      }
      else if (act === "continue") this.onContinue?.();
      else if (act === "collection") this.onCollection();
      else this.onDebug?.();
      return;
    }
  }

  render(d: Display): void {
    this.renderForest(d);
    const cx = SCREEN_W / 2;

    // 指輪。完全な円にせず、禁書の外へ残った「余白」を切れ目で示す。
    const ctx = d.ctx;
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = PAL.accentCool;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, 86, 58, -Math.PI * 0.92, Math.PI * 0.47);
    ctx.stroke();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = PAL.accent;
    ctx.beginPath();
    ctx.arc(cx, 86, 63, Math.PI * 0.58, Math.PI * 1.78);
    ctx.stroke();
    ctx.restore();

    const series = GAME_IDENTITY.seriesTitle;
    const sw = d.measure(series, 11);
    d.text(series, Math.round(cx - sw / 2), 42, PAL.dim, 11);

    const title = GAME_IDENTITY.subtitle;
    const tw = d.measure(title, 25);
    d.text(title, Math.round(cx - tw / 2), 66, PAL.ink, 25);

    // 活字の罫線ではなく、森の道のように中央だけ明るい短い線。
    const ruleW = Math.round(tw + 24);
    const ruleX = Math.round(cx - ruleW / 2);
    for (let i = 0; i < ruleW; i++) {
      const k = 1 - Math.abs(i - ruleW / 2) / (ruleW / 2);
      if (k < 0.12 || (k < 0.42 && i % 4 === 0)) continue;
      ctx.globalAlpha = 0.25 + k * 0.65;
      d.rect(ruleX + i, 101, 1, 1, i % 7 === 0 ? PAL.accentCool : PAL.accent);
    }
    ctx.globalAlpha = 1;

    const menuW = 164;
    const menuX = Math.round(cx - menuW / 2);
    this.items.forEach((item, i) => {
      const on = i === this.index;
      const y = 122 + i * 22;
      if (on) {
        selectionRow(d, menuX, y - 6, menuW - 4, 19);
      }
      const w = d.measure(item.label);
      const x = Math.round(cx - w / 2);
      if (on) d.text("◆", menuX + 10, y, PAL.accentCool);
      d.text(item.label, x, y, on ? PAL.ink : PAL.dim);
    });

    const line = `言葉 ${this.player.grimoire.size} / ${allSpells().length}`;
    const lw = d.measure(line);
    const statsX = Math.round(cx - lw / 2);
    d.rect(statsX - 10, SCREEN_H - 50, lw + 20, 1, PAL.line);
    d.text(line, statsX, SCREEN_H - 41, PAL.dim);

    d.textRight("↑↓ 選択　ENTER 決定", SCREEN_W - 20, SCREEN_H - 20, PAL.hint);

    if (this.confirmingNew) this.renderNewConfirmation(d);
  }

  private renderNewConfirmation(d: Display): void {
    d.ctx.save();
    d.ctx.globalAlpha = 0.68;
    d.rect(0, 0, SCREEN_W, SCREEN_H, PAL.shadow);
    d.ctx.restore();
    const x = 78, y = 72, w = 324, h = 126;
    windowBox(d, x, y, w, h, PAL.accent);
    d.text("現在の冒険を消して、はじめから？", x + 22, y + 22, PAL.ink);
    d.text("集めた言葉と音量設定は残ります。", x + 22, y + 46, PAL.dim, 10);
    const choices = ["戻る", "はじめから"];
    choices.forEach((label, index) => {
      const bx = x + 42 + index * 134;
      const selected = this.confirmIndex === index;
      if (selected) {
        selectionRow(d, bx, y + 75, 108, 25);
      }
      d.text(selected ? "◆" : " ", bx + 10, y + 82, PAL.accentCool, 10);
      d.text(label, bx + 29, y + 81, selected ? PAL.ink : PAL.dim, 10);
    });
  }

  private renderForest(d: Display): void {
    const ctx = d.ctx;
    d.clear(FOREST.skyTop);

    ctx.save();
    const sky = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    sky.addColorStop(0, FOREST.skyTop);
    sky.addColorStop(0.52, FOREST.skyBottom);
    sky.addColorStop(1, PAL.bg);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // 遠景。滑らかな絵ではなく、矩形の塊で枝葉を作る。
    ctx.globalAlpha = 0.48;
    for (let i = 0; i < 13; i++) {
      const x = i * 42 - 18;
      const h = 72 + ((i * 37) % 52);
      ctx.fillStyle = i % 2 === 0 ? FOREST.foliage : FOREST.shadow;
      ctx.fillRect(x, SCREEN_H - h, 31, h);
      ctx.fillRect(x - 11, SCREEN_H - h + 8, 52, 9);
      ctx.fillRect(x - 18, SCREEN_H - h + 22, 64, 8);
    }

    // 手前の地面と、中央へ抜ける細い道。
    ctx.globalAlpha = 1;
    const ground = ctx.createLinearGradient(0, 188, 0, SCREEN_H);
    ground.addColorStop(0, "rgba(8, 24, 20, 0)");
    ground.addColorStop(1, FOREST.shadow);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 170, SCREEN_W, 100);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = FOREST.groundLight;
    ctx.beginPath();
    ctx.moveTo(218, 176);
    ctx.lineTo(264, 176);
    ctx.lineTo(332, SCREEN_H);
    ctx.lineTo(144, SCREEN_H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.bloom.render(d, LIGHTS, 0.018, PAL.accentCool);

    // 胞子は光より前、文字より後ろ。1px単位で速度を落として漂わせる。
    ctx.save();
    for (const mote of MOTES) {
      const y = (mote.y - this.t * mote.speed + 230) % 230;
      const x = mote.x + Math.sin(this.t * 0.45 + mote.phase) * mote.drift;
      ctx.globalAlpha = mote.bright ? 0.68 : 0.28;
      d.rect(Math.round(x), Math.round(y), mote.bright ? 2 : 1, 1, mote.bright ? PAL.accent : PAL.accentCool);
    }
    ctx.restore();

    // 端だけを落とす。中央の題とメニューには掛けすぎない。
    ctx.save();
    const vignette = ctx.createRadialGradient(
      SCREEN_W / 2, SCREEN_H / 2, 82,
      SCREEN_W / 2, SCREEN_H / 2, 300,
    );
    vignette.addColorStop(0, "rgba(3, 9, 8, 0)");
    vignette.addColorStop(1, "rgba(3, 9, 8, 0.72)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
  }
}
