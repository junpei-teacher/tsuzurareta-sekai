import type { ImageMap } from "../core/assets.ts";
import { Display, SCREEN_W } from "../core/display.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import type { ThemeId } from "../core/theme.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
import { renderBattleBackdrop, type BattleBackdropVariant } from "../fx/battleBackdrop.ts";
import { CastFx, type FxElement } from "../fx/castFx.ts";
import { drawBoundaryBeast, drawDoubleLoopKnot, drawForestEnemy } from "../fx/storyArt.ts";
import { ITEM_MP, ITEM_NAME, type Player } from "../game/player.ts";
import { Battle, spawn, type EncounterRule, type EnemyDef } from "../battle/model.ts";
import { SUGGEST_PER_PAGE, TextField } from "../ui/textField.ts";
import { bar, selectionRow, statusTags, windowBox } from "../ui/hud.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { elementIcon, ICON_SIZE } from "../ui/icons.ts";
import { allSpells, spellFor, type Element } from "../spell/book.ts";

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

export type BattleSceneOptions = {
  rule?: EncounterRule;
  theme?: ThemeId;
  backdropVariant?: BattleBackdropVariant;
  /** 物語戦だけが使う、答えを忘れた時の段階的な記憶救済。 */
  assist?: {
    memoryWord: string;
    memoryPlace: string;
    memoryKind?: "slane" | "sena";
    onlyWhenMemorySealed?: boolean;
  };
  /** 戦闘中に新しい言葉を発見した時だけ呼ぶ。保存方式は呼び出し元が決める。 */
  onKnowledgeChange?: () => void;
  /** DEVの敵比較から実戦レイアウトを確認するときだけ使う帰還口。 */
  debugExit?: () => void;
};

type AssistView = "NONE" | "MENU" | "IMAGE" | "MEMORY_CONFIRM" | "MEMORY_SCENE" | "RETRY_CONFIRM";

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
  private readonly options: BattleSceneOptions;

  private readonly fx = new CastFx();
  private readonly field = new TextField();
  private readonly grimoire = new GrimoireView();
  private readonly bloom = new BloomLayer();

  private cmd = 0;
  private item = 0;
  private caret = 0;
  private hitFlash = 0;
  private assistView: AssistView = "NONE";
  private assistChoice = 0;
  private prevEnemyHp: number;
  private prevPlayerHp: number;
  private prevPhase: Battle["phase"];

  constructor(
    player: Player,
    enemyDef: EnemyDef,
    images: ImageMap,
    onExit: (result: "WIN" | "LOSE" | "FLED") => void,
    options: BattleSceneOptions = {},
  ) {
    this.player = player;
    this.battle = new Battle(player, spawn(enemyDef), options.rule ?? null);
    this.images = images;
    this.onExit = onExit;
    this.options = options;
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

    if (this.battle.enemy.hp < this.prevEnemyHp && this.battle.lastCast?.kind !== "CALL") {
      const yielded = Boolean(this.options.rule?.nonlethalVictory) && this.battle.enemy.hp <= 0;
      this.hitFlash = yielded ? 0 : 1;
      // 詠唱中なら炸裂の瞬間まで待つ。光と音がズレると演出が安っぽくなる
      const wait = this.fx.burstIn;
      if (yielded) sfx.play("learn", wait + 0.16);
      else {
        sfx.play("hit", wait);
        if (this.battle.enemy.hp <= 0) sfx.play("defeat", wait + 0.22);
      }
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

    if ((key === "F2" || key === "Escape") && this.options.debugExit) {
      sfx.play("cancel");
      this.options.debugExit();
      return;
    }

    if (this.assistView !== "NONE") {
      this.handleAssistKey(key);
      return;
    }

    if (
      key === "Escape" &&
      this.options.assist &&
      (!this.options.assist.onlyWhenMemorySealed || b.memorySealed) &&
      (b.phase === "COMMAND" || b.phase === "CASTING")
    ) {
      sfx.play("page");
      this.assistView = "MENU";
      this.assistChoice = 0;
      return;
    }

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
          // 属性で色と粒の動きが変わる（castFx.ts の ELEMENT）。
          // 音も回復だけ変わる。**傷が塞がる音に破裂は要らない**
          const element = (report.spell?.element ?? "NONE") as FxElement;
          this.fx.play(report.resolution.tier, report.word, report.resolution.hash, !report.firstTime, element);
        } else if (report.kind === "LOCKED") {
          this.fx.playLocked(report.resolution.tier, report.word, report.resolution.hash);
        } else if (report.kind === "DUD") {
          this.fx.play("DUD", report.word, report.resolution.hash);
        }
        // **掘り当てた瞬間に呼び出し元へ知らせる。**
        // legacyとシリーズ2では保存形式が違う。BattleSceneが特定の保存領域へ
        // 直接書くと、新作から旧作セーブが再び混ざるため、ここでは通知だけにする。
        if (report.kind === "CAST" ? report.firstTime : report.kind === "LOCKED") {
          this.options.onKnowledgeChange?.();
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

  private handleAssistKey(key: string): void {
    const action = key === "Enter" || key === " ";

    if (this.assistView === "MENU") {
      const count = 3;
      if (key === "ArrowUp") {
        this.assistChoice = (this.assistChoice + count - 1) % count;
        sfx.play("move");
      }
      if (key === "ArrowDown") {
        this.assistChoice = (this.assistChoice + 1) % count;
        sfx.play("move");
      }
      if (key === "Escape") {
        sfx.play("cancel");
        this.assistView = "NONE";
      }
      if (action) {
        sfx.play("confirm");
        if (this.assistChoice === 0) {
          this.assistView = "NONE";
          this.battle.phase = "CASTING";
          this.field.clear();
          this.syncDictionary();
        } else if (this.assistChoice === 1) {
          this.assistView = "IMAGE";
        } else {
          this.assistView = "RETRY_CONFIRM";
          this.assistChoice = 0;
        }
      }
      return;
    }

    if (this.assistView === "IMAGE") {
      if (key === "Escape") {
        sfx.play("cancel");
        this.assistView = "MENU";
        this.assistChoice = 1;
      } else if (action) {
        sfx.play("page");
        this.assistView = "MEMORY_CONFIRM";
        this.assistChoice = 0;
      }
      return;
    }

    if (this.assistView === "MEMORY_SCENE") {
      if (action || key === "Escape") {
        sfx.play(action ? "page" : "cancel");
        this.assistView = "NONE";
        this.battle.phase = "CASTING";
        this.field.clear();
        this.syncDictionary();
      }
      return;
    }

    if (this.assistView === "MEMORY_CONFIRM" || this.assistView === "RETRY_CONFIRM") {
      if (key === "ArrowLeft" || key === "ArrowRight") {
        this.assistChoice = this.assistChoice === 0 ? 1 : 0;
        sfx.play("move");
      }
      if (key === "Escape") {
        sfx.play("cancel");
        const wasMemory = this.assistView === "MEMORY_CONFIRM";
        this.assistView = "MENU";
        this.assistChoice = wasMemory ? 1 : 2;
      }
      if (!action) return;

      sfx.play("confirm");
      if (this.assistView === "MEMORY_CONFIRM") {
        if (this.assistChoice === 1) {
          this.assistView = "MEMORY_SCENE";
        } else {
          this.assistView = "MENU";
          this.assistChoice = 1;
        }
      } else if (this.assistChoice === 1) {
        // シリーズ2の呼び出し元ではLOSEと同じCheckpoint復帰処理へ入る。
        this.onExit("LOSE");
      } else {
        this.assistView = "MENU";
        this.assistChoice = 2;
      }
    }
  }

  // ── 描画 ──────────────────────────────────

  render(d: Display): void {
    renderBattleBackdrop(
      d, this.caret, this.options.theme ?? "forest", this.options.backdropVariant ?? "default",
    );
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
    if (this.assistView !== "NONE") this.renderAssist(d);
    if (this.options.debugExit) d.textRight("ESC/F2 比較へ", 468, 10, PAL.hint, 8);
  }

  private renderEnemy(d: Display): void {
    const e = this.battle.enemy;

    // 呼吸のような上下動。1枚絵でも「止まっている」と感じさせないための最低限
    const bob = Math.sin(this.caret * 2.2) * 1.5;
    const flashing = this.hitFlash > 0.4;
    const img = this.images[`enemy.${e.def.id}`];

    // 背景が付くと、接地影が無い敵は空中に貼り付いて見える。
    const shadowW = img ? Math.min(76, Math.max(28, d.spriteW(img) * 0.64)) : Math.min(72, e.def.sprite.w * 0.78);
    d.ctx.save();
    d.ctx.globalAlpha = 0.42;
    d.ctx.fillStyle = PAL.shadow;
    d.ctx.beginPath();
    d.ctx.ellipse(SCREEN_W / 2, GROUND_Y + 3, shadowW, 7, 0, 0, Math.PI * 2);
    d.ctx.fill();
    d.ctx.globalAlpha = 0.18;
    d.ctx.fillStyle = PAL.accentCool;
    d.ctx.beginPath();
    d.ctx.ellipse(SCREEN_W / 2, GROUND_Y + 1, shadowW * 0.62, 3, 0, 0, Math.PI * 2);
    d.ctx.fill();
    d.ctx.restore();

    if (img) {
      // 被弾中は同じ形の白シルエットに差し替える。輪郭が保たれるので何に当たったか分かる
      d.spriteFoot(flashing ? d.silhouette(img, "#f4e6c8") : img, SCREEN_W / 2, GROUND_Y + bob);
    } else {
      // 完成画像の投入前も、フィールドと同じ仮シルエットで種別を見分けられるようにする。
      if (e.def.id === "boundary_beast") {
        drawBoundaryBeast(
          d, SCREEN_W / 2, GROUND_Y + bob, this.caret,
          Boolean(this.options.rule?.nonlethalVictory) && e.hp <= 0,
        );
      } else {
        drawForestEnemy(d, SCREEN_W / 2, GROUND_Y + bob, this.caret, e.def.id);
      }
      if (flashing) {
        d.ctx.save();
        d.ctx.globalAlpha = 0.18;
        d.rect(SCREEN_W / 2 - e.def.sprite.w / 2, GROUND_Y - e.def.sprite.h, e.def.sprite.w, e.def.sprite.h, PAL.ink);
        d.ctx.restore();
      }
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
    if (this.options.rule?.nonlethalVictory) {
      d.text("警戒", 150, 36, PAL.dim);
      bar(d, 186, 27, 144, 5, e.hp / e.maxHp, PAL.accentCool);
      d.textRight(e.hp <= 0 ? "爪を収めた" : "境界を守っている", 330, 36, e.hp <= 0 ? PAL.accent : PAL.dim);
    } else if (e.def.dummy) {
      d.textRight("何度でも", 330, 26, PAL.dim);
    } else {
      bar(d, 150, 26, 180, 6, e.hp / e.maxHp, e.hp / e.maxHp > 0.3 ? PAL.hp : PAL.danger);
      d.textRight(`${e.hp} / ${e.maxHp}`, 330, 36, PAL.dim);
    }

    // **相性は、既定では出さない。**
    //
    // 一度は常に出していたが、書いてあると**試し打ちをしなくなる。**
    // このゲームの中心にある行為は知らない言葉を打ってみることで（設計書 3）、
    // 答えが先に見えていると、その手前で止まる。
    //
    // かわりに、当てた結果で分かるようにしてある。
    //   弱点  「弱点を突いた！　47 のダメージ。」
    //   耐性  「効果はいまひとつだ。　8 のダメージ。」
    //   無効  「紙喰い虫 には 通じない。」
    //
    // 見えるのは「見抜く」（REVEAL）を唱えているあいだだけ。
    // これで、ほとんど使い道の無かったあの呪文に役目が戻る。
    // 記号の意味は呪文帳の説明文（「火属性」）で分かる
    if (this.battle.revealed) {
      const groups: Array<{ label: string; list: Element[] }> = [
        { label: "弱点", list: e.def.weak },
        { label: "半減", list: e.def.resist },
        { label: "無効", list: e.def.immune },
      ].filter((g) => g.list.length > 0);

      // HPの数字（y=36 に右寄せ）と同じ行に置くと重なる。1段下げる
      let ix = 150;
      for (const g of groups) {
        d.text(g.label, ix, 50, g.label === "弱点" ? PAL.accent : PAL.dim);
        ix += d.measure(g.label) + 3;
        for (const el of g.list) {
          // 効かない属性は薄く。並んでいても、突くべきものと区別がつく
          elementIcon(d, ix, 51, el, g.label === "弱点" ? 1 : 0.55);
          ix += ICON_SIZE + 2;
        }
        ix += 8;
      }
    }

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
          if (i === this.cmd) selectionRow(d, 25, y - 2, 152, 14);
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
          // **3列2段で6件。** 以前は2列2段の4件だったが、呪文帳が育つと
          // 頭文字1字で5つ6つ並ぶので、覚えている語が候補に出てこなかった。
          // 6件を超えるぶんは頁で送る。TAB で選び進めると頁も付いてくる
          const per = SUGGEST_PER_PAGE;
          const page = this.field.cursor >= 0 ? Math.floor(this.field.cursor / per) : 0;
          const shown = this.field.suggestions.slice(page * per, page * per + per);
          const rest = this.field.suggestions.length - shown.length;
          shown.forEach((s, i) => {
            const sx = 32 + (i % 3) * 140;
            const y = 162 + Math.floor(i / 3) * 15;
            const on = page * per + i === this.field.cursor;
            // 打ち切った語は明るく出す。**綴りが合っていることの手応え**になる
            const done = s === this.field.value;
            if (on) selectionRow(d, sx - 4, y - 1, 140, 13);
            d.text(s, sx, y, on ? PAL.accent : done ? PAL.ink : PAL.dim);
            if (done && !on) d.text("＝", sx - 12, y, PAL.accent);
            // **候補の隣に属性の記号を出す。**
            // 相性の一覧は敵の側に出さない（設計書 4.4）ので、
            // 選ぶ手元で「これは何の属性か」が分かるようにしておく。
            // ここが記号を覚える二つ目の経路になる（もう一つは呪文帳の説明文）
            const sp = spellFor(s);
            if (sp) elementIcon(d, sx + d.measure(s) + 4, y + 2, sp.element);
          });
          // まだ後ろに控えている件数。**出ていない候補があることは見せる**
          if (rest > 0) d.textRight(`ほか ${rest}`, 452, 148, PAL.hint);
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
        const assistAvailable = this.options.assist
          && (!this.options.assist.onlyWhenMemorySealed || b.memorySealed);
        d.textRight(assistAvailable ? "ESC 記憶／再試行" : "ESC もどる", 452, 190, PAL.hint);
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
          if (i === this.item) selectionRow(d, 25, y - 2, 172, 14);
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

    d.text(`${p.name}　LV${p.level}　攻撃${p.attack}`, 28, 216, PAL.ink);
    // 総数を出す。タイトルと収集画面が `/ 57` を出すのに、
    // **いちばん長く見ている戦闘画面だけ**分母が無かった
    d.textRight(`呪文帳 ${p.grimoire.size} / ${TOTAL_SPELLS} 種`, 452, 216, PAL.dim);

    d.text("HP", 28, 230, PAL.dim);
    bar(d, 50, 231, 130, 8, p.hp / p.maxHp, PAL.hp);
    d.text(`${p.hp}/${p.maxHp}`, 186, 230, PAL.dim);

    d.text("MP", 250, 230, PAL.dim);
    bar(d, 272, 231, 130, 8, p.mp / p.maxMp, PAL.mp);
    d.text(`${p.mp}/${p.maxMp}`, 408, 230, PAL.dim);

    statusTags(d, 28, 244, p.statuses);
  }

  private renderResult(d: Display): void {
    const label =
      this.battle.phase === "WIN" ? this.battle.resultLabel ?? "勝利" :
      this.battle.phase === "LOSE" ? "目の前が、白くなった" : "逃げ切った";
    const col = this.battle.phase === "LOSE" ? TIER_COLOR.DUD : PAL.accent;
    d.ctx.globalAlpha = 0.7;
    d.rect(0, 96, SCREEN_W, 46, PAL.shadow);
    d.ctx.globalAlpha = 1;
    const w = d.measure(label, 24);
    d.text(label, Math.round((SCREEN_W - w) / 2), 104, col, 24);
    d.textRight("ENTER", 452, 128, PAL.dim);
  }

  private renderAssist(d: Display): void {
    d.ctx.save();
    d.ctx.globalAlpha = 0.9;
    d.rect(0, 0, 480, 270, PAL.shadow);
    d.ctx.globalAlpha = 1;

    if (this.assistView === "IMAGE") {
      // 第一段階は文字を出さず、該当する原場面の形だけを戻す。
      const slane = this.options.assist?.memoryKind === "slane";
      if (slane) {
        for (const x of [112, 350]) {
          d.rect(x, 50, 12, 146, "#b9c4b2");
          d.rect(x + 3, 78, 8, 3, "#708679");
          d.rect(x, 132, 7, 2, "#708679");
        }
        d.rect(154, 78, 172, 96, "#c8b98d");
        d.frame(154, 78, 172, 96, "#6c6046");
        for (let y = 91; y < 163; y += 14) d.rect(164, y, 152, 1, "#b4a57d");
        for (let i = 0; i < 5; i++) {
          d.rect(194 + i * 20, 117 + (i % 2) * 3, 12, 2, PAL.accentCool);
        }
        d.rect(310, 148, 3, 3, "#8d7452");
        d.rect(313, 148, 1, 1, PAL.accentCool);
      } else {
        d.rect(94, 93, 124, 38, "#9d8050");
        d.frame(94, 93, 124, 38, PAL.accent);
        d.rect(262, 93, 124, 38, "#9d8050");
        d.frame(262, 93, 124, 38, PAL.accent);
        drawDoubleLoopKnot(d, 240, 80, 1.35, "#c4a66c");
        d.rect(218, 76, 17, 7, "#315f5a");
        d.rect(245, 76, 17, 7, "#315f5a");
      }
      const blink = Math.floor(this.caret * 2) % 2 === 0;
      if (blink) d.text("▼", 234, 226, PAL.accent);
      d.ctx.restore();
      return;
    }

    if (this.assistView === "MEMORY_SCENE") {
      windowBox(d, 62, 34, 356, 196);
      d.text(this.options.assist?.memoryPlace ?? "十年前", 84, 50, PAL.accentCool, 11);
      const slane = this.options.assist?.memoryKind === "slane";
      d.text(
        slane ? "友だちが、白い木の向こうで拾った石摺りを開く。" : "友だちの指が、木札をゆっくりなぞる。",
        84, 76, PAL.dim,
      );
      d.rect(156, 96, 168, 70, slane ? "#c8b98d" : "#9d8050");
      d.frame(156, 96, 168, 70, slane ? "#6c6046" : PAL.accent);
      if (slane) for (let y = 105; y < 160; y += 13) d.rect(164, y, 151, 1, "#b4a57d");
      const word = this.options.assist?.memoryWord ?? "";
      const wordW = d.measure(word, 20);
      d.text(word, Math.round((SCREEN_W - wordW) / 2), 118, slane ? "#27362f" : PAL.ink, 20);
      if (slane) {
        [..."SENA"].forEach((char, i) => d.text(char, 270 + i * 7, 148 - i * 2, "#35483e", 9));
      }
      d.text(
        slane ? "声にすると、この指輪が少し温かくなる。" : "S、E、N、A。これなら、お前も間違えない。",
        84, 182, PAL.dim,
      );
      d.textRight("ENTER　入力へ戻る", 396, 208, PAL.hint);
      d.ctx.restore();
      return;
    }

    if (this.assistView === "MENU") {
      windowBox(d, 116, 58, 248, 154);
      d.text("どうする？", 140, 78, PAL.accentCool, 11);
      const rows = ["入力へ戻る", "記憶をたどる", "戦闘前から再試行"];
      rows.forEach((label, i) => {
        const y = 108 + i * 28;
        if (i === this.assistChoice) d.rect(136, y - 5, 208, 20, PAL.selection);
        d.text(i === this.assistChoice ? "◆" : "　", 144, y, PAL.accentCool);
        d.text(label, 168, y, i === this.assistChoice ? PAL.ink : PAL.dim);
      });
      d.ctx.restore();
      return;
    }

    windowBox(d, 82, 82, 316, 108);
    const memory = this.assistView === "MEMORY_CONFIRM";
    d.text(memory ? "文字を含む記憶を、もう一度見る？" : "戦闘前の安全な場所へ戻る？", 104, 100, PAL.ink);
    if (memory) {
      d.text(this.options.assist?.memoryPlace ?? "十年前", 104, 120, PAL.dim, 10);
    }
    const choices = memory ? ["戻る", "思い返す"] : ["続ける", "再試行"];
    choices.forEach((label, i) => {
      const x = 122 + i * 148;
      if (i === this.assistChoice) d.rect(x - 8, 142, 124, 22, PAL.selection);
      d.text(i === this.assistChoice ? "◆" : "　", x, 148, PAL.accentCool);
      d.text(label, x + 24, 148, i === this.assistChoice ? PAL.ink : PAL.dim);
    });
    d.ctx.restore();
  }
}
