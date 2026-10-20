import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { GAME_IDENTITY } from "../core/gameIdentity.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { THEMES } from "../core/theme.ts";

/**
 * 十年前の越冬配給札へ、自分の名前を彫る。
 *
 * 設定画面ではなく、セナの札の隣へ自分の札を吊るす物語内の行為として見せる。
 * `SENA` は幼なじみの固定名なので、主人公名には使用できない。
 */

/** 署名欄に入る長さ。設計書 2.2 は 4〜8 文字 */
const MIN_LEN = 4;
const MAX_LEN = 8;
const RESERVED_NAME = "SENA";

/** 前回の名前を覚えておく。周回で毎回打ち直させない */
const KEY = `${GAME_IDENTITY.storagePrefix}/name`;

export function loadName(): string {
  try {
    const name = (localStorage.getItem(KEY) ?? "").slice(0, MAX_LEN);
    return name === RESERVED_NAME ? "" : name;
  } catch {
    return "";
  }
}

function storeName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* 保存できなくても進行には差し支えない */
  }
}

export class NameInputScene implements Scene {
  private value = loadName();
  private t = 0;
  /** 入場の暗転。オープニングと同じ呼吸で明ける */
  private fade = 1;
  /** 短すぎる名で確定しようとしたときだけ光る */
  private warn = 0;
  private warnText = "";

  constructor(
    private readonly onDone: (name: string) => void,
    private readonly onCancel: () => void,
  ) {}

  update(dt: number, keys: string[]): void {
    this.t += dt;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 1.2);
    if (this.warn > 0) this.warn = Math.max(0, this.warn - dt);

    for (const key of keys) {
      if (key === "Enter") {
        // 暗転が明けきるまでは確定させない。
        // 前の画面から Enter を押しっぱなしにしていたぶんが飛び込んでくる
        if (this.fade > 0.05) continue;
        if (this.value.length < MIN_LEN) {
          sfx.play("denied");
          this.warn = 1.6;
          this.warnText = `名前は ${MIN_LEN} 文字から。`;
          continue;
        }
        if (this.value === RESERVED_NAME) {
          sfx.play("denied");
          this.warn = 2.2;
          this.warnText = "その名は、隣の札に刻まれている。";
          continue;
        }
        sfx.play("learn");
        storeName(this.value);
        this.onDone(this.value);
        return;
      }
      if (key === "Escape") {
        sfx.play("cancel");
        this.onCancel();
        return;
      }
      if (key === "Backspace") {
        if (this.value.length === 0) continue;
        this.value = this.value.slice(0, -1);
        this.warn = 0;
        sfx.play("erase");
        continue;
      }
      // **数字は受け付けない。** ハッシュは A-Z0-9 を通すが、
      // ここは署名欄であって、入力欄ではない
      if (key.length === 1 && /[A-Z]/.test(key)) {
        if (this.value.length >= MAX_LEN) { sfx.play("denied"); continue; }
        this.value += key;
        this.warn = 0;
        sfx.play("type");
      }
    }
  }

  render(d: Display): void {
    const ctx = d.ctx;
    d.clear(THEMES.village.shadow);
    const wall = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    wall.addColorStop(0, "#24483f");
    wall.addColorStop(0.62, "#6f674a");
    wall.addColorStop(1, "#27362b");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    d.rect(0, 34, SCREEN_W, 8, "#23382f");
    d.rect(0, 214, SCREEN_W, 56, "#213128");
    for (let x = 34; x < SCREEN_W; x += 62) d.rect(x, 214, 1, 56, "#40513c");
    // 梁の隙間から入る薄い朝光と、札を彫る作業台。
    ctx.save();
    const shaft = ctx.createLinearGradient(380, 36, 286, 206);
    shaft.addColorStop(0, "rgba(222,205,139,0.14)");
    shaft.addColorStop(1, "rgba(222,205,139,0)");
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(363, 40);
    ctx.lineTo(434, 40);
    ctx.lineTo(355, 214);
    ctx.lineTo(245, 214);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    d.rect(40, 172, 400, 9, "#4c402d");
    d.rect(40, 181, 400, 34, "#332d24");
    d.rect(44, 174, 392, 2, "#756142");

    const cx = SCREEN_W / 2;
    d.text("十年前　共同倉", 22, 16, PAL.accentCool, 11);
    const instruction = "セナの札の隣へ、自分の名を刻む。";
    d.text(instruction, Math.round(cx - d.measure(instruction) / 2), 57, PAL.ink);

    // 二枚の札を横に並べる。入力欄ではなく、同じ村にいる二人の記録。
    const leftX = 82, rightX = 254, tagY = 91, tagW = 144, tagH = 72;
    for (const x of [leftX, rightX]) {
      ctx.strokeStyle = "#66563d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 72, 41);
      ctx.lineTo(x + 72, tagY + 3);
      ctx.stroke();
      d.rect(x + 3, tagY + 4, tagW, tagH, PAL.shadow);
      d.rect(x, tagY, tagW, tagH, "#b3955c");
      d.rect(x + 3, tagY + 3, tagW - 6, 1, "#d8bf7c");
      d.frame(x, tagY, tagW, tagH, "#665337");
      d.rect(x + 71, tagY + 3, 2, 2, "#57472f");
      d.text("越冬配給札", x + 37, tagY + 10, "#443823", 9);
    }
    d.text("SENA", leftX + 47, tagY + 33, "#20332b", 14);
    d.text("麦 1　塩 1　油 1", leftX + 24, tagY + 54, "#56472f", 9);

    const sx = rightX + 25;
    const pitch = d.measure("A");
    const cursorOn = Math.floor(this.t * 2) % 2 === 0;
    for (let i = this.value.length; i < MAX_LEN; i++) {
      const need = i < MIN_LEN;
      d.text("_", sx + i * pitch, tagY + 35, need ? "#6f6040" : "#8c7650");
    }
    d.text(this.value, sx, tagY + 35, "#20332b");
    if (cursorOn && this.value.length < MAX_LEN) {
      d.text("_", sx + this.value.length * pitch, tagY + 35, "#315f5a");
    }
    d.text("麦 1　塩 1　油 1", rightX + 24, tagY + 54, "#56472f", 9);

    // 入力欄の外に道具と削り屑を置き、「入力」ではなく「彫刻」に見せる。
    d.rect(368, 178, 43, 3, "#665541");
    d.rect(405, 175, 10, 5, "#a9aaa0");
    d.rect(414, 176, 9, 2, "#d1d0bf");
    for (const [x, y] of [[280, 178], [290, 182], [305, 177], [319, 184]] as const) {
      d.rect(x, y, 5, 1, "#b7985d");
      d.rect(x + 1, y + 1, 2, 1, "#806746");
    }

    const note = this.warn > 0
      ? this.warnText
      : "A-Zで、4～8文字。";
    const nw = d.measure(note);
    d.text(note, Math.round(cx - nw / 2), 187, this.warn > 0 ? PAL.danger : PAL.dim);

    d.textRight(
      this.value.length >= MIN_LEN
        ? "ENTER 刻む　ESC もどる"
        : "A-Z 入力　BACKSPACE 消す　ESC もどる",
      SCREEN_W - 24, SCREEN_H - 26, PAL.hint,
    );

    if (this.fade > 0) {
      d.ctx.globalAlpha = this.fade;
      d.rect(0, 0, SCREEN_W, SCREEN_H, PAL.shadow);
      d.ctx.globalAlpha = 1;
    }
  }
}
