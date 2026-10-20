import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
import type { Player } from "../game/player.ts";
import { allSpells } from "../spell/book.ts";
import { authoredEntries, fragmentCount } from "../ending/resolve.ts";

/**
 * タイトル（設計書 7.5）。
 *
 * これまで起動すると Phase 3 のデバッグメニューが出ていた。
 * 敵の一覧と「HP/MP/道具を全回復」が並ぶ画面で、**作品の入口ではなかった。**
 *
 * 見せ方はオープニングとエンディングに揃える。暗い画面に文字が浮かぶだけ。
 * 始まりと終わりが同じ表情になる、という決めごとがすでにあるので、
 * その列にタイトルも入れる。
 *
 * 下段に集めた数を出す。**これがこの作品で唯一積み上がるものである**（設計書 5.4）。
 * 一周目は 1/57 から始まり、遊ぶほど増える。タイトルに置くのが一番効く。
 */

const TITLE = "焚書の夜";

type Item = { label: string; act: "start" | "continue" | "vault" | "collection" | "debug" };

/**
 * 画面外の下から差す火。**画面の中に炎は描かない。**
 *
 * ここは書庫が燃えはじめる前の夜で、火はまだ下の階にある。
 * 光だけが届いていて、光源は見えない、という置き方にしてある。
 */
const FIRE: Light[] = [
  { x: 150, y: SCREEN_H + 26, radius: 170, strength: 0.5, color: "#c8792f" },
  { x: 330, y: SCREEN_H + 34, radius: 150, strength: 0.4, color: "#a8563f" },
];

export class TitleScene implements Scene {
  private index = 0;
  private t = 0;
  private readonly bloom = new BloomLayer();
  private readonly items: Item[];

  constructor(
    private readonly player: Player,
    private readonly onStart: () => void,
    private readonly onVault: () => void,
    private readonly onCollection: () => void,
    private readonly onDebug: () => void,
    private readonly onContinue?: () => void,
  ) {
    this.items = onContinue ? [
      { label: "つづきから", act: "continue" },
      { label: "はじめから", act: "start" },
    ] : [{ label: "はじめる", act: "start" }];
    /**
     * **一度でも白紙に向き合った人にだけ出す。**
     *
     * 禁書は第3章の最奥にあって、書けるのは1周に1回だけだった。
     * 断章40本と結末24本を集めるには、実際に数えて **104周** かかる。
     * 「集めたもの」に、原理的に埋まらない欄が64個並んでいた。
     *
     * 初回は必ずタイトルへ戻す。書き換えないことを選ぶ重さ（設計書 6.5）は
     * 一度目にしか無いので、そこは触らない。**二度目からは、何度でも立てる。**
     *
     * 旗は増やさない。断章か結末を1つでも見ていれば、書いた証拠になる。
     */
    const wrote = player.seenEndings.size + player.seenFragments.size > 0;
    if (wrote) this.items.push({ label: "禁書を開く", act: "vault" });
    this.items.push({ label: "集めたもの", act: "collection" });
    /**
     * 「ためす」も、書き終えた人には開ける。
     *
     * もとは開発用の飛び込み口だったが、書庫のどこへでも行けて
     * どの相手とも戦えるので、**通した人へのおまけとしてそのまま通じる。**
     * セーブを消す項目だけは向こうで隠してある（`src/scenes/select.ts`）。
     */
    if (import.meta.env.DEV) {
      this.items.push({ label: "ためす（開発）", act: "debug" });
    } else if (wrote) {
      this.items.push({ label: "ためす", act: "debug" });
    }
  }

  update(dt: number, keys: string[]): void {
    this.t += dt;
    this.bloom.update(dt);
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
      if (act === "start") this.onStart();
      else if (act === "continue") this.onContinue?.();
      else if (act === "vault") this.onVault();
      else if (act === "collection") this.onCollection();
      else this.onDebug();
      return;
    }
  }

  render(d: Display): void {
    d.clear("#0b0908");

    const cx = SCREEN_W / 2;

    // 火はいちばん下に敷く。**文字の上には乗せない。**
    // 題やメニューがにじむと、格好はつくが読めなくなる
    this.bloom.render(d, FIRE, 0.03);

    // 題。24px は章の扉と同じ大きさ
    const tw = d.measure(TITLE, 24);
    d.text(TITLE, Math.round(cx - tw / 2), 62, PAL.ink, 24);

    // 題の下の線。**均一に引かない。**
    // 真っ直ぐな1pxだと図表の罫線に見える。端を焦がして、焼け跡の縁にする
    const lx = Math.round(cx - tw / 2) - 8;
    const ruleW = tw + 16;
    for (let i = 0; i < ruleW; i++) {
      // 中央がいちばん濃く、端へ向かって切れていく
      const k = 1 - Math.abs(i - ruleW / 2) / (ruleW / 2);
      const a = Math.min(1, k * 1.6);
      if (a < 0.12) continue;
      // 揺らぎ。1pxおきに抜けを作ると、燃え残りの縁のように見える
      if (a < 0.55 && (i * 7919) % 5 < 2) continue;
      d.ctx.globalAlpha = a;
      d.rect(lx + i, 92, 1, 1, PAL.accent);
    }
    d.ctx.globalAlpha = 1;

    this.items.forEach((item, i) => {
      const on = i === this.index;
      const w = d.measure(item.label);
      const x = Math.round(cx - w / 2);
      const y = (this.items.length > 4 ? 112 : 132) + i * 20;
      if (on) d.text("▸", x - 16, y, PAL.accent);
      d.text(item.label, x, y, on ? PAL.ink : PAL.dim);
    });

    // 積み上がっているもの。**周回で残るのはこの3つだけ**
    const p = this.player;
    const line =
      `呪文 ${p.grimoire.size} / ${allSpells().length}　　` +
      `断章 ${p.seenFragments.size} / ${fragmentCount()}　　` +
      `結末 ${p.seenEndings.size} / ${authoredEntries().length}`;
    const lw = d.measure(line);
    d.rect(Math.round(cx - lw / 2) - 12, SCREEN_H - 56, lw + 24, 1, PAL.line);
    d.text(line, Math.round(cx - lw / 2), SCREEN_H - 46, PAL.dim);

    d.textRight("↑↓ 選択　ENTER 決定", SCREEN_W - 24, SCREEN_H - 24, PAL.hint);
  }
}
