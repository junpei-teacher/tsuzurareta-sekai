import type { ImageMap } from "../core/assets.ts";
import { Display, SCREEN_W } from "../core/display.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
import { CastFx } from "../fx/castFx.ts";
import { ITEM_MP, ITEM_NAME, type Player } from "../game/player.ts";
import { Battle, spawn, type EnemyDef } from "../battle/model.ts";
import { TextField } from "../ui/textField.ts";
import { bar, statusTags, windowBox } from "../ui/hud.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { saveProgress } from "../game/save.ts";
import { allSpells, ELEMENT_JP, type Element } from "../spell/book.ts";

const COMMANDS = ["詠唱", "呪文帳", "道具", "逃げる"] as const;

/** この世界に在る呪文の総数。呪文帳の枚数に分母を出すため */
const TOTAL_SPELLS = allSpells().length;

/** 敵が立つ床の高さ。全ての敵はここに足元を合わせる */
const GROUND_Y = 120;

/**
 * コマンド窓の中身の配置。
 *
 * 窓は y=136 から 68px（136〜204）。**この外に文字を置くと枠を突き抜ける。**
 * 4行を 16px 間隔で 148 から並べると最後の「逃げる」が 208 まで伸びて、
 * 実際に枠線の上に乗っていた。行間を 15 に詰め、開始を 141 に上げてある。
 */
const ROW_Y = 141;
const ROW_H = 15;

/**
 * 戦闘画面（手順書 Phase 3、Phase 7 で敵をドット絵に差し替え）。
 *
 * 敵は正面1枚絵。回転もアニメも持たないかわりに、
 * 呼吸のような上下動と、火を持つ敵のブルームで「止まって見えない」ようにする。
 */
export class BattleScene implements Scene {
  private readonly battle: Battle;
  private readonly player: Player;
  private readonly images: ImageMap;
  private readonly onExit: (result: "WIN" | "LOSE" | "FLED") => void;

  private readonly fx = new CastFx();
  private readonly field = new TextField();
  private readonly grimoire = new GrimoireView();
  private readonly bloom = new BloomLayer();

  private cmd = 0;
  private item = 0;
  private caret = 0;
  private hitFlash = 0;
  private prevEnemyHp: number;
  private prevPlayerHp: number;
  private prevPhase: Battle["phase"];

  constructor(
    player: Player,
    enemyDef: EnemyDef,
    images: ImageMap,
    onExit: (result: "WIN" | "LOSE" | "FLED") => void,
  ) {
    this.player = player;
    this.battle = new Battle(player, spawn(enemyDef));
    this.images = images;
    this.onExit = onExit;
    this.prevEnemyHp = this.battle.enemy.hp;
    this.prevPlayerHp = player.hp;
    this.prevPhase = this.battle.phase;
    this.syncDictionary();
  }

  /**
   * サジェスト辞書と控えを呪文帳と同期する。
   * **記憶を封じられているあいだは両方とも空にする。**
   * 控えは呪文帳の端に書いたものなので、頁が読めなければこれも読めない。
   */
  private syncDictionary(): void {
    const sealed = this.battle.memorySealed;
    this.field.setDictionary(sealed ? [] : this.player.knownWords());
    this.field.setRiddles(sealed ? [] : this.player.openRiddles());
  }

  update(dt: number, keys: string[]): void {
    this.caret += dt;
    this.fx.update(dt);
    this.bloom.update(dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);

    if (this.battle.enemy.hp < this.prevEnemyHp) {
      this.hitFlash = 1;
      // 詠唱中なら炸裂の瞬間まで待つ。光と音がズレると演出が安っぽくなる
      const wait = this.fx.burstIn;
      sfx.play("hit", wait);
      if (this.battle.enemy.hp <= 0) sfx.play("defeat", wait + 0.22);
    }
    this.prevEnemyHp = this.battle.enemy.hp;

    if (this.player.hp < this.prevPlayerHp) sfx.play("hurt");
    this.prevPlayerHp = this.player.hp;

    // 逃げ切った瞬間だけ鳴らす。「回り込まれた」ときは鳴らない
    if (this.battle.phase === "FLED" && this.prevPhase !== "FLED") sfx.play("flee");
    this.prevPhase = this.battle.phase;

    for (const key of keys) this.handleKey(key);
  }

  private handleKey(key: string): void {
    const b = this.battle;

    switch (b.phase) {
      case "MESSAGE":
        if (key === "Enter" || key === " ") {
          sfx.play("page");
          b.advance();
          this.syncDictionary();
        }
        return;

      case "COMMAND":
        if (key === "ArrowUp") {
          this.cmd = (this.cmd + COMMANDS.length - 1) % COMMANDS.length;
          sfx.play("move");
        }
        if (key === "ArrowDown") {
          this.cmd = (this.cmd + 1) % COMMANDS.length;
          sfx.play("move");
        }
        if (key === "Enter" || key === " ") {
          if (this.cmd === 0) {
            sfx.play("confirm");
            b.phase = "CASTING";
            this.field.clear();
            this.syncDictionary();
          } else if (this.cmd === 1) {
            // 記憶を封じられていると呪文帳が開けない
            if (b.memorySealed) {
              sfx.play("denied");
              b.messages.push("呪文帳を開いた。", "……頁の文字が、読めない。");
              b.phase = "MESSAGE";
            } else {
              sfx.play("page");
              b.phase = "GRIMOIRE";
              this.grimoire.reset();
            }
          } else if (this.cmd === 2) {
            sfx.play("confirm");
            b.phase = "ITEM";
            this.item = 0;
          } else {
            b.flee();
          }
        }
        return;

      case "GRIMOIRE":
        if (this.grimoire.handle(key, this.player)) b.phase = "COMMAND";
        return;

      case "CASTING": {
        if (key === "Escape" && this.field.value.length === 0) {
          sfx.play("cancel");
          b.phase = "COMMAND";
          return;
        }
        const submitted = this.field.feed(key);
        if (submitted === null) return;
        if (submitted.trim().length === 0) return; // 空Enterは無視
        const report = b.cast(submitted);
        if (report.kind === "CAST") {
          // 回復呪文は光は同じで音だけ変わる。**傷が塞がる音に破裂は要らない**
          const heal = report.spell?.element === "HEAL";
          this.fx.play(report.resolution.tier, report.word, report.resolution.hash, !report.firstTime, heal);
        } else if (report.kind === "LOCKED") {
          this.fx.playLocked(report.resolution.tier, report.word, report.resolution.hash);
        } else if (report.kind === "DUD") {
          this.fx.play("DUD", report.word, report.resolution.hash);
        }
        // **掘り当てた瞬間に書き出す。**
        // 保存が戦闘終了時だけだと、レアを引き当てた直後に閉じたぶんが消える。
        // 周回を跨いで積み上がるのは呪文帳だけなので（設計書 5.4）、
        // ここを取りこぼすと、そのプレイで得たものが何も残らない
        if (report.kind === "CAST" ? report.firstTime : report.kind === "LOCKED") {
          saveProgress(this.player);
        }
        this.syncDictionary();
        return;
      }

      case "ITEM": {
        const max = 3;
        if (key === "ArrowUp") { this.item = (this.item + max - 1) % max; sfx.play("move"); }
        if (key === "ArrowDown") { this.item = (this.item + 1) % max; sfx.play("move"); }
        if (key === "Escape") { sfx.play("cancel"); b.phase = "COMMAND"; }
        if (key === "Enter" || key === " ") {
          sfx.play("confirm");
          if (this.item === 0) b.useItem("ink");
          else if (this.item === 1) b.useItem("drop");
          else b.phase = "COMMAND";
        }
        return;
      }

      case "WIN":
      case "LOSE":
      case "FLED":
        if (key === "Enter" || key === " ") { sfx.play("confirm"); this.onExit(b.phase); }
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
    if (this.battle.phase === "GRIMOIRE") {
      // 高さ 184 だと窓の下端が 204 まで来て、操作ヒント（208）が
      // その下の HP/MP 窓（210〜）に潜り込んでいた。窓を縮めてヒントを上げる
      this.grimoire.render(d, 16, 20, 448, 170, this.player);
      d.textRight("↑↓ 選択　ESC とじる", 452, 194, PAL.hint);
    } else {
      this.renderWindow(d);
    }
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

    // 呼吸のような上下動。1枚絵でも「止まっている」と感じさせないための最低限
    const bob = Math.sin(this.caret * 2.2) * 1.5;
    const flashing = this.hitFlash > 0.4;
    const img = this.images[`enemy.${e.def.id}`];

    if (img) {
      // 被弾中は同じ形の白シルエットに差し替える。輪郭が保たれるので何に当たったか分かる
      d.spriteFoot(flashing ? d.silhouette(img, "#f4e6c8") : img, SCREEN_W / 2, GROUND_Y + bob);
    } else {
      // 画像が無いとき用の代替。差し替え漏れに気づけるよう、黙って消さずに矩形を出す
      const { w, h, color } = e.def.sprite;
      const x = Math.round((SCREEN_W - w) / 2);
      const y = Math.round(GROUND_Y + bob) - h;
      d.rect(x, y, w, h, flashing ? "#e8dcc0" : color);
      d.frame(x, y, w, h, PAL.line);
    }

    // 火を抱えた敵は自分の周りを照らす。フィールドと同じブルームを使い回す
    const glow = e.def.glow;
    if (glow) {
      const lights: Light[] = [{
        x: SCREEN_W / 2,
        y: GROUND_Y + bob - glow.dy,
        radius: glow.radius,
        strength: glow.strength,
        color: glow.color,
      }];
      this.bloom.render(d, lights, 0);
    }

    // 名前とHPは敵より後に描く。ボスは背が高く、頭がこの高さまで来るため
    const name = e.def.name;
    const nameW = d.measure(name);
    d.text(name, Math.round((SCREEN_W - nameW) / 2), 10, PAL.ink);

    // 稽古台に体力の目盛りは要らない。**9975 / 9999 と出ると、
    // 倒せる相手に見えて、倒しに行った人が延々と殴ることになる**
    if (e.def.dummy) {
      d.textRight("何度でも", 330, 26, PAL.dim);
    } else {
      bar(d, 150, 26, 180, 6, e.hp / e.maxHp, e.hp / e.maxHp > 0.3 ? "#a8563f" : "#d0402f");
      d.textRight(`${e.hp} / ${e.maxHp}`, 330, 36, PAL.dim);
    }

    // **相性は最初から出す。**
    //
    // 以前は「見抜く」を唱えているあいだしか見えなかった。
    // 属性は敵ごとに設定してあるのに、それが見えないので
    // プレイヤーは同じ呪文を並べるしかなかった。弱点を探す遊び（設計書 4.4）は、
    // **弱点が見えて初めて遊びになる。**
    // 属性は日本語一字で出す。FIRE/ICE はともかく NAME/NONE は英語では通じない。
    const jp = (list: Element[]) => list.map((el) => ELEMENT_JP[el]).join("・");
    const parts: string[] = [];
    if (e.def.weak.length) parts.push(`弱点 ${jp(e.def.weak)}`);
    if (e.def.resist.length) parts.push(`半減 ${jp(e.def.resist)}`);
    if (e.def.immune.length) parts.push(`無効 ${jp(e.def.immune)}`);
    // HPの数字（y=36 に右寄せ）と同じ行に置くと重なる。1段下げる
    if (parts.length) d.text(parts.join("　"), 150, 50, PAL.accent);

    statusTags(d, 150, 124, e.statuses);
  }

  private renderWindow(d: Display): void {
    const b = this.battle;
    windowBox(d, 16, 136, 448, 68);

    switch (b.phase) {
      case "MESSAGE": {
        const page = b.messages.slice(0, Battle.PAGE);
        // 「ROZHA を唱えた」の呪文名は、地の文に埋もれさせない
        page.forEach((m, i) => d.textRich(m, 30, 148 + i * 16, PAL.ink, PAL.accent));
        if (b.messages.length > Battle.PAGE) {
          const blink = Math.floor(this.caret * 3) % 2 === 0;
          if (blink) d.text("▼", 446, 188, PAL.accent);
        } else {
          d.textRight("ENTER", 452, 188, PAL.hint);
        }
        break;
      }

      case "COMMAND":
        COMMANDS.forEach((c, i) => {
          const y = ROW_Y + i * ROW_H;
          if (i === this.cmd) d.text("▸", 30, y, PAL.accent);
          d.text(c, 44, y, i === this.cmd ? PAL.ink : PAL.dim);
        });
        d.text("↑↓ 選択　ENTER 決定", 200, ROW_Y, PAL.hint);
        break;

      case "CASTING": {
        const cursorOn = Math.floor(this.caret * 2) % 2 === 0;
        d.text(`> ${this.field.value}${cursorOn ? "_" : ""}`, 30, ROW_Y, PAL.ink);

        if (b.memorySealed) {
          d.text("覚えていたはずの綴りが、思い出せない。", 30, 164, PAL.danger);
        } else if (this.field.suggestions.length > 0) {
          // 候補は最大4つ。縦に並べると枠からはみ出すので2列2段にする
          this.field.suggestions.forEach((s, i) => {
            const sx = 32 + (i % 2) * 150;
            const y = 162 + Math.floor(i / 2) * 15;
            const on = i === this.field.cursor;
            // 打ち切った語は明るく出す。**綴りが合っていることの手応え**になる
            const done = s === this.field.value;
            if (on) d.rect(sx - 4, y - 1, 140, 13, "#2c241f");
            d.text(s, sx, y, on ? PAL.accent : done ? PAL.ink : PAL.dim);
            if (done && !on) d.text("＝", sx - 12, y, PAL.accent);
          });
          // 右下の「ESC もどる」は 392 から始まる。ここを 340 に置くと重なる
          d.text(this.field.exact ? "ENTER 唱える" : "TAB 候補", 292, 190, PAL.hint);
        } else if (this.field.riddleHints.length > 0) {
          // **欠けた綴りの控え（設計書 3.8）。**
          //
          // 世界の側で「打っていい」と教えておいて、実際に打つと
          // 「（呪文帳にない言葉）」と否定形で返すのはちぐはぐだった。
          // 埋めかけの控えを持っているなら、それをここに出す。
          //
          // **候補と違い TAB では確定できない。** 穴は自分で埋めるものなので、
          // 確定できてしまうと巻物を拾ったのと同じになる。
          this.field.riddleHints.forEach((r, i) => {
            const y = 162 + i * 15;
            d.text("未解読", 32, y, PAL.dim);
            d.text(r.mask, 76, y, PAL.accent);
            if (r.place) d.textRight(r.place, 288, y, PAL.dim);
          });
          d.text("自分で埋める", 292, 190, PAL.hint);
        } else if (this.field.value.length > 0) {
          // 打っている最中の重要な手がかり。ヒントではなく本文の扱いにする
          d.text("（呪文帳にない言葉）", 30, 164, PAL.dim);
        }
        d.textRight("ESC もどる", 452, 190, PAL.hint);
        break;
      }

      case "ITEM": {
        const rows = [
          `${ITEM_NAME.ink}　　×${this.player.items.ink}　　MP+${ITEM_MP.ink}`,
          `${ITEM_NAME.drop}　　×${this.player.items.drop}　　MP+${ITEM_MP.drop}`,
          "もどる",
        ];
        rows.forEach((r, i) => {
          const y = ROW_Y + i * ROW_H;
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

    d.text(p.name, 28, 216, PAL.ink);
    // 総数を出す。タイトルと収集画面が `/ 57` を出すのに、
    // **いちばん長く見ている戦闘画面だけ**分母が無かった
    d.textRight(`呪文帳 ${p.grimoire.size} / ${TOTAL_SPELLS} 種`, 452, 216, PAL.dim);

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
