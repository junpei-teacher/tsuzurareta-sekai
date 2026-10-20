import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";

/**
 * 名前入力（設計書 2.2）。
 *
 * **これは設定画面ではない。第1章の最初の仕事である。**
 *
 * 主人公の仕事は名を書き写すことなので、名乗る場面も「書く」形にしてある。
 * 当番表のいちばん上には MIRA があり、その下に自分の名を書く。
 *
 * この配置がそのまま、第1章の最後のミラの台詞に効く。
 *
 * > 「当番表、明日のぶんも書いといてね」
 * > 「MIRA って書いて、その下にあなたの名前」
 * > 「いつもの順番」
 *
 * 60分前に一度やらされた「いつもの順番」を、彼女が最後に口にする。
 * ついでに、**アルファベットで名を書く**という行為をここで一度通しておく。
 * 終章の白紙の前で `MIRA` と打てるかは、この作品の成否そのものである（2.3）。
 */

/** 署名欄に入る長さ。設計書 2.2 は 4〜8 文字 */
const MIN_LEN = 4;
const MAX_LEN = 8;

/** 前回の名前を覚えておく。周回で毎回打ち直させない */
const KEY = "funsho-no-yoru/name";

export function loadName(): string {
  try {
    return (localStorage.getItem(KEY) ?? "").slice(0, MAX_LEN);
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

  constructor(private readonly onDone: (name: string) => void) {}

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
          continue;
        }
        sfx.play("learn");
        storeName(this.value);
        this.onDone(this.value);
        return;
      }
      if (key === "Backspace") {
        if (this.value.length === 0) continue;
        this.value = this.value.slice(0, -1);
        sfx.play("erase");
        continue;
      }
      // **数字は受け付けない。** ハッシュは A-Z0-9 を通すが、
      // ここは署名欄であって、入力欄ではない
      if (key.length === 1 && /[A-Z]/.test(key)) {
        if (this.value.length >= MAX_LEN) { sfx.play("denied"); continue; }
        this.value += key;
        sfx.play("type");
      }
    }
  }

  render(d: Display): void {
    d.clear("#0b0908");

    const cx = SCREEN_W / 2;
    // 「彼女の名だ」と書くと、まだ会っていない人物を説明したことになる。
    // **ここではただ「いつも同じ名前が上にある」だけでいい。**
    // 誰なのかは第1章で分かるし、分かったときにこの一行が効く
    const lines = ["当番表に、明日の署名を書く。", "いちばん上は、いつも同じ名前だ。"];
    lines.forEach((line, i) => {
      const w = d.measure(line);
      d.text(line, Math.round(cx - w / 2), 72 + i * 18, PAL.dim);
    });

    // 署名欄。MIRA が上にあり、**その下**に自分の名を書く。
    // 二段の罫線だけで当番表に見せる。枠を描くと入力フォームになってしまう
    const boxW = 200;
    const bx = Math.round(cx - boxW / 2);
    const sx = bx + 20;
    d.rect(bx, 132, boxW, 1, PAL.line);
    d.rect(bx, 168, boxW, 1, PAL.line);

    d.text("MIRA", sx, 118, PAL.accent);

    // 空欄は下線で見せる。**欄そのものが長さを語る**ので、
    // 「4〜8文字」と注記するより早い。ASCII は等幅なので桁が揃う
    const pitch = d.measure("A");
    const cursorOn = Math.floor(this.t * 2) % 2 === 0;
    for (let i = this.value.length; i < MAX_LEN; i++) {
      // まだ足りていない桁は少し明るく。ここまで書けば署名として通る、が見える
      const need = i < MIN_LEN;
      d.text("_", sx + i * pitch, 154, need ? PAL.dim : PAL.line);
    }
    d.text(this.value, sx, 154, PAL.ink);
    if (cursorOn && this.value.length < MAX_LEN) {
      d.text("_", sx + this.value.length * pitch, 154, PAL.accent);
    }

    const note = this.warn > 0
      ? `署名は ${MIN_LEN} 文字から。`
      : "アルファベットで、自分の名を。";
    const nw = d.measure(note);
    d.text(note, Math.round(cx - nw / 2), 192, this.warn > 0 ? PAL.danger : PAL.dim);

    d.textRight(
      this.value.length >= MIN_LEN ? "ENTER 書く" : "A-Z 入力　BACKSPACE 消す",
      SCREEN_W - 24, SCREEN_H - 26, PAL.hint,
    );

    if (this.fade > 0) {
      d.ctx.globalAlpha = this.fade;
      d.rect(0, 0, SCREEN_W, SCREEN_H, "#0b0908");
      d.ctx.globalAlpha = 1;
    }
  }
}
