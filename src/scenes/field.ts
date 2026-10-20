import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import type { Keyboard } from "../core/input.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { ITEM_MP, ITEM_NAME, type ItemKind, type Player } from "../game/player.ts";
import {
  enemyRefFor, getMap, walkable,
  type GameMap, type MapEntity, type SignLook, type Tile,
} from "../field/mapFormat.ts";
import { noticeFor } from "../field/notices.ts";
import type { FieldState } from "../field/state.ts";
import { WANG_SHELF, WANG_STONE, type WangTable } from "../field/tileset.ts";
import { frames, type ImageMap } from "../core/assets.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
import { BurnLayer, scorch } from "../fx/burn.ts";
import { saveProgress } from "../game/save.ts";
import { spellById } from "../spell/book.ts";
import { ChapterTitle } from "../ui/chapterTitle.ts";
import { DialogueBox, speaker, type Speaker } from "../ui/dialogue.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { bar, windowBox } from "../ui/hud.ts";
import { ENEMIES } from "../battle/model.ts";

const TILE = 16;
const ORIGIN_X = 16;
const ORIGIN_Y = 26;
/** 上下の帯。部屋の絵はこのあいだにだけ見える */
const HEADER_H = 22;
const FOOTER_Y = 249;
/** 1マス進むのにかかる秒数 */
const STEP_TIME = 0.15;
/**
 * スプライトの足元をマス下端からどれだけ下げるか。
 * PixelLab の出力はキャンバス内で少し浮いているので、その分を吸収する。
 */
const SPRITE_FOOT = 4;
/** 待機モーションの再生速度（1秒あたりのコマ数）。ゆっくりでいい */
const IDLE_FPS = 5;
/**
 * 歩行サイクルの再生速度。
 * 1マス0.15秒なので、4フレームなら約6.7fpsで1マス1周する。
 * 足が地面を滑らないよう、この2つは揃えておく。
 */
const WALK_FPS = 6.7;

/** 道具袋に並ぶ順。戦闘の「道具」と同じ並びにしておく */
const ITEMS: ItemKind[] = ["ink", "drop"];

const DIRS = {
  up: { x: 0, y: -1, key: "ArrowUp" },
  down: { x: 0, y: 1, key: "ArrowDown" },
  left: { x: -1, y: 0, key: "ArrowLeft" },
  right: { x: 1, y: 0, key: "ArrowRight" },
} as const;

type Dir = keyof typeof DIRS;

/** 内部の向き名 → アセットの方位名。PixelLab の出力が方位で並ぶため */
const COMPASS: Record<Dir, string> = {
  up: "north",
  down: "south",
  left: "west",
  right: "east",
};

export class FieldScene implements Scene {
  /** 会話の分岐や移動の途中を保存すると、再開時にイベントを飛ばしてしまう。 */
  get canCheckpoint(): boolean {
    return !this.dialogue.active && !this.title.active && this.stepT === 0
      && !this.pendingBattle && !this.pendingWarp && !this.miraFarewell;
  }

  private map: GameMap;
  private readonly dialogue = new DialogueBox();
  private readonly grimoire = new GrimoireView();
  private readonly burn = new BurnLayer();
  private readonly bloom = new BloomLayer();
  private readonly title = new ChapterTitle();
  private grimoireOpen = false;
  /** 道具袋を開いているか。開いているあいだは歩けない */
  private itemOpen = false;
  private itemIdx = 0;

  /** 移動中の補間。0で静止 */
  private stepT = 0;
  private fromX = 0;
  private fromY = 0;
  private lastTalkedMira = false;
  /** ミラの最後の会話を開いた。閉じたら第2章へ */
  private miraFarewell = false;
  /** 会話を閉じたら始まる戦い（ボス）*/
  private pendingBattle: { ref: string; cellKey: string } | null = null;
  /** 会話を閉じたら潜る先（書架の裏の隙間など。扉の絵を出さずに繋ぐ） */
  private pendingWarp: NonNullable<Speaker["leadsTo"]> | null = null;
  /** 歩行サイクルの位相。歩いているあいだだけ進む */
  private walkPhase = 0;
  private time = 0;
  private notice = "";
  private noticeT = 0;

  constructor(
    private readonly kb: Keyboard,
    private readonly player: Player,
    private readonly state: FieldState,
    private readonly images: ImageMap,
    private readonly onBattle: (enemyId: string, cellKey: string) => void,
    private readonly onVault: () => void,
    private readonly onExit: () => void,
  ) {
    this.map = getMap(state.mapId);
    this.fromX = state.x;
    this.fromY = state.y;
    saveProgress(player);

    // 直前の戦いに勝って手に入れたものが先。章の切り替えとは同時に起きない
    if (!this.claimReward()) this.openChapter();
  }

  /**
   * 章が切り替わった直後の一式：**扉 → 章頭の地の文 → 入室時の会話。**
   *
   * これを場面の constructor にしか書いていなかったので、
   * デバッグメニューから章へ飛んだときだけ扉が出て、
   * **物語の流れで次の章へ進むと出なかった。**
   * 章が変わる場所は3つ（起動時・ミラとの別れ・階段）あるので、必ずここを通す。
   */
  private openChapter(): void {
    const st = this.state;
    if (st.titleCard) {
      this.title.start(st.titleCard);
      st.titleCard = null;
    }
    if (st.intro.length > 0) {
      this.dialogue.open({ name: "", color: PAL.ink, talks: [] }, st.intro);
      st.intro = [];
    }
    this.checkOnEnter();
  }

  /**
   * 勝って手に入れた呪文を渡す。渡すものがあれば true。
   *
   * 巻物を拾うのではなく、**倒した相手から言葉を持ち帰る。**
   * 状況の一行を必ず添える。呪文名だけ増えても、それは戦利品でしかない。
   */
  private claimReward(): boolean {
    const r = this.state.pendingReward;
    this.state.pendingReward = null;
    if (!r) return false;

    // **文は必ず出す。** 倒した相手がどうなったかの描写であって、
    // 呪文の受け渡し通知ではない。自力で掘り当てていた人だけ場面が飛ぶ、
    // というのはおかしい。書き加える一行だけを、初めてのときに足す。
    const lines = [...r.lines];
    if (!this.player.grimoire.has(r.id)) {
      this.player.grimoire.set(r.id, r.word);
      const name = spellById(r.id)?.name ?? r.word;
      lines.push(`（呪文帳に「${name}」が書き加えられた）`);
      saveProgress(this.player);
    }
    this.dialogue.open({ name: "", color: PAL.ink, talks: [] }, lines);
    return true;
  }

  /**
   * 部屋に入った時点で始まる相手がいれば、その場で会話を開いて開戦へ繋ぐ。
   *
   * 台詞は全て続けて出す。1回話しかけるごとに1つ、では
   * ラスボスの登場が「同じ相手に5回話しかける作業」になってしまう。
   */
  private checkOnEnter(): void {
    if (this.dialogue.active) return;
    for (const e of this.map.entities) {
      if (e.kind !== "npc") continue;
      const sp = speaker(e.ref, this.state.chapter);
      if (!sp?.onEnter || !sp.battleAfter) continue;
      if (!this.entityActive(e)) continue;
      const cellKey = `${this.map.id}:npc:${e.ref}`;
      if (this.state.defeated.has(cellKey)) continue;
      this.dialogue.open(sp, sp.talks.flat());
      this.pendingBattle = { ref: sp.battleAfter, cellKey };
      this.state.pendingReward = sp.reward ?? null;
      return;
    }
  }

  /** 炎上中は色を焦がす（設計書 2.8） */
  private col(hex: string): string {
    return this.state.burning ? scorch(hex) : hex;
  }

  // ── 更新 ──────────────────────────────────

  update(dt: number, keys: string[]): void {
    // 章の扉が下りているあいだは、下で何も進めない。
    // 会話の1文字ずつ表示もここで止めておかないと、幕が上がったときに読み終えている
    if (this.title.active) {
      this.title.update(dt);
      for (const key of keys) if (key === "Enter" || key === " ") this.title.skip();
      return;
    }

    this.time += dt;
    this.dialogue.update(dt);
    this.bloom.update(dt);
    if (this.state.burning) this.burn.update(dt);
    if (this.noticeT > 0) this.noticeT -= dt;

    for (const key of keys) this.handleKey(key);

    if (this.dialogue.active || this.grimoireOpen || this.itemOpen) return;
    this.updateMovement(dt);
  }

  private handleKey(key: string): void {
    if (this.dialogue.active) {
      if (key === "Enter" || key === " ") {
        const done = this.dialogue.advance();
        if (!done) return;
        // 別れの挨拶を聞き終えた瞬間に夜が明ける。イベントシーンは挟まない
        if (this.miraFarewell) { this.miraFarewell = false; this.beginChapter2(); return; }
        if (this.pendingBattle && !this.state.defeated.has(this.pendingBattle.cellKey)) {
          const b = this.pendingBattle;
          this.pendingBattle = null;
          this.onBattle(b.ref, b.cellKey);
          return;
        }
        if (this.pendingWarp) {
          const w = this.pendingWarp;
          this.pendingWarp = null;
          this.warpTo(w);
          return;
        }
        if (this.lastTalkedMira) { this.moveMira(); return; }
        // 戦利品の文などで入室時の会話を出しそびれていたら、ここで拾う。
        // **部屋に入った瞬間に始まる相手を、素通りさせない**ための保険
        this.checkOnEnter();
      }
      return;
    }
    if (this.grimoireOpen) {
      if (this.grimoire.handle(key, this.player)) this.grimoireOpen = false;
      return;
    }
    if (this.itemOpen) { this.handleItemKey(key); return; }
    if (key === "Enter" || key === " ") this.interact();
    if (key === "Tab") { this.grimoireOpen = true; this.grimoire.reset(); }
    if (key === "I") { this.itemOpen = true; this.itemIdx = 0; }
    if (key === "Escape") this.onExit();
  }

  /**
   * 道具袋。戦闘の「道具」と同じものを、歩いているあいだにも使えるようにする。
   * 使うのは Player.useItem（戦闘と共通）。回復量が二重管理にならないようにする。
   */
  private handleItemKey(key: string): void {
    if (key === "Escape" || key === "I") { this.itemOpen = false; return; }
    if (key === "ArrowUp") this.itemIdx = (this.itemIdx + ITEMS.length - 1) % ITEMS.length;
    if (key === "ArrowDown") this.itemIdx = (this.itemIdx + 1) % ITEMS.length;
    if (key !== "Enter" && key !== " ") return;

    const kind = ITEMS[this.itemIdx]!;
    if (this.player.mp >= this.player.maxMp) {
      this.showNotice("これ以上は、注いでも溢れる。");
      return;
    }
    const healed = this.player.useItem(kind);
    if (healed < 0) {
      this.showNotice(`${ITEM_NAME[kind]}は、もう持っていない。`);
      return;
    }
    this.showNotice(`${ITEM_NAME[kind]}を 使った。　MP が ${healed} 回復した。`);
    saveProgress(this.player);
  }

  private updateMovement(dt: number): void {
    if (this.stepT > 0) {
      this.walkPhase += dt;
      this.stepT = Math.max(0, this.stepT - dt / STEP_TIME);
      if (this.stepT === 0) this.onArrive();
      return;
    }

    let dir: Dir | null = null;
    for (const d of Object.keys(DIRS) as Dir[]) {
      if (this.kb.isDown(DIRS[d].key)) { dir = d; break; }
    }
    if (!dir) return;

    this.state.facing = dir;
    const nx = this.state.x + DIRS[dir].x;
    const ny = this.state.y + DIRS[dir].y;
    if (!this.canEnter(nx, ny)) {
      // 階段にぶつかったなら、なぜ降りられないのかを言う
      if (this.tileAt(nx, ny) === "V" && this.noticeT <= 0) {
        const why = this.state.stairsReason(this.map.id);
        if (why) { sfx.play("denied"); this.showNotice(why); }
      }
      return;
    }

    this.fromX = this.state.x;
    this.fromY = this.state.y;
    this.state.x = nx;
    this.state.y = ny;
    this.stepT = 1;
    // 一歩ごとに鳴る。**全編でいちばん回数の多い音**なので、いちばん小さくしてある
    sfx.play("step");
  }

  private canEnter(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return false;
    // 第2章の瓦礫と、崩れて通れるようになったマス
    if (this.state.isBlocked(this.map.id, x, y)) return false;
    if (this.state.isOpened(this.map.id, x, y)) return true;
    if (!walkable(this.tileAt(x, y))) return false;

    // **置いてあるものには、すべて重なれない。**
    // 乗れるものと乗れないものが混ざっていると、何が物で何が床か分からなくなる。
    // 通り抜けられるのは扉だけで、あれは物ではなく開口部である。

    // 人は押しのけられない。**縦2マス分**塞ぐ。
    // 立ち姿は 48px（＝1.5マス）あるので、足元のマスだけ塞いでも
    // 頭のあたりをすり抜けられて、重なって見える
    if (this.npcBlocks(x, y)) return false;

    // 張り紙・落書き・彫り跡・穴。
    // ただし**その章に存在しないもの**は、床として扱う（焼却命令書は第2章にしか無い）
    const sign = this.entityAt(x, y, "sign");
    if (sign && this.entityActive(sign)) return false;

    // 敵のシンボル。倒した相手はもういない
    if (this.enemyAt(x, y)) return false;

    if (this.entityAt(x, y, "vault")) return false;
    return true;
  }

  /** そのマスが人に塞がれているか。足元と、その1つ上を見る */
  private npcBlocks(x: number, y: number): boolean {
    for (const dy of [0, 1]) {
      const npc = this.entityAt(x, y + dy, "npc");
      if (npc && this.entityActive(npc)) return true;
    }
    return false;
  }

  private tileAt(x: number, y: number): Tile {
    return this.map.tiles[y]?.[x] ?? "#";
  }

  private entityAt(x: number, y: number, kind?: MapEntity["kind"]): MapEntity | undefined {
    return this.map.entities.find(
      (e) => e.x === x && e.y === y && (kind === undefined || e.kind === kind),
    );
  }

  /**
   * その人物が今この部屋にいるか。
   *
   * 出る章は会話データの `chapters` が持つ（無ければ全章）。
   * ミラだけは、そのうえで巡回先の部屋にしかいない。
   * **第2章で彼女がいないのは特別扱いではなく、`chapters: [1]` の結果である。**
   */
  private entityActive(e: MapEntity): boolean {
    const sp = speaker(e.ref, this.state.chapter);
    if (!sp) return false;
    if (sp.chapters && !sp.chapters.includes(this.state.chapter)) return false;
    // 戦って勝った相手は、もうそこにいない。道も開く
    if (sp.battleAfter && this.state.defeated.has(`${this.map.id}:npc:${e.ref}`)) return false;
    if (e.ref === "mira") return this.state.miraRoom === this.map.id;
    return true;
  }

  private onArrive(): void {
    const { x, y } = this.state;

    // 崩れた階段。第3章へ降りる
    if (this.state.isOpened(this.map.id, x, y)) {
      sfx.play("stairs");
      this.state.startChapter(3, this.player);
      this.map = getMap(this.state.mapId);
      this.fromX = this.state.x;
      this.fromY = this.state.y;
      this.stepT = 0;
      this.openChapter();
      return;
    }

    const door = this.entityAt(x, y, "door");
    if (door) {
      sfx.play("door");
      this.state.mapId = door.ref;
      this.state.x = door.toX ?? 1;
      this.state.y = door.toY ?? 1;
      this.map = getMap(door.ref);
      this.fromX = this.state.x;
      this.fromY = this.state.y;
      this.checkOnEnter();
      return;
    }

    // **敵のマスは踏めない。** 開戦は「しらべる」で起こす（interact）
  }

  /** そのマスに、今この章で立っている敵がいるか */
  private enemyAt(x: number, y: number): { ref: string; cellKey: string } | undefined {
    const e = this.entityAt(x, y, "enemy");
    if (!e) return undefined;
    // 同じマスでも、第1章と第2章では出るものが違う（設計書 2.8）
    const ref = enemyRefFor(e, this.state.chapter);
    if (!ref) return undefined;
    const cellKey = `${this.map.id}:${x},${y}`;
    if (this.state.defeated.has(cellKey)) return undefined;
    return { ref, cellKey };
  }

  private interact(): void {
    const d = DIRS[this.state.facing];
    const tx = this.state.x + d.x;
    const ty = this.state.y + d.y;

    // 禁書。調べると書き込みへ
    if (this.entityAt(tx, ty, "vault")) {
      this.onVault();
      return;
    }

    // **敵は「しらべる」で始める。**
    // 踏んだ瞬間に始まると、避けたい相手の脇を通るだけで巻き込まれる。
    // 調べる物と同じ操作にしておけば、始める側が決められる
    const foe = this.enemyAt(tx, ty);
    if (foe) {
      this.onBattle(foe.ref, foe.cellKey);
      return;
    }

    // 人は縦2マス塞ぐので、**上から話しかけると目の前は「頭」のマス**になる。
    // そこには実体が無いので、下向きのときだけもう1マス先を見る
    const head = this.state.facing === "down"
      ? this.entityAt(tx, ty + 1, "npc")
      : undefined;
    const target =
      this.entityAt(tx, ty, "npc") ?? head ?? this.entityAt(tx, ty, "sign");
    if (!target) {
      // 目の前の家具について一行返す。同じ棚なら、いつ調べても同じ文
      const line = noticeFor(this.map, tx, ty, this.state.chapter);
      if (line) this.showNotice(line);
      return;
    }
    if (!this.entityActive(target)) return;

    const sp = speaker(target.ref, this.state.chapter);
    if (!sp) return;
    const i = this.state.nextTalk(target.ref, sp.talks.length);
    const talk = [...(sp.talks[i] ?? [])];

    // ミラは巡回中。見つけた部屋と、何度目かで、していることが違う
    const found = sp.found?.[this.map.id];
    if (found && found.length > 0) talk.unshift(found[i % found.length]!);

    // 呪文は巻物で拾うのではなく、人から教わる。
    // **`=== i` にすると、その回をちょうど開かないと一生手に入らない。**
    // 話しかける回数は人任せなので、通り過ぎていれば渡す
    for (const g of sp.grants ?? []) {
      if (i < g.talk || this.player.grimoire.has(g.id)) continue;
      this.player.grimoire.set(g.id, g.word);
      const name = spellById(g.id)?.name ?? g.word;
      talk.push(`（呪文帳に「${name}」が書き加えられた）`);
      // このゲームで唯一の、澄んだ音。**言葉が増えることだけが前進**なので、
      // ここにだけ「良いことが起きた音」を置く
      sfx.play("learn");
      saveProgress(this.player);
    }

    // 欠けた綴りは**渡さない。控えるだけ。**
    //
    // ここで呪文帳に入れてしまうと `grants` と同じものになり、
    // 「自分で打った」という一点が丸ごと消える。埋める場所は戦闘の入力欄しかない。
    // 一行出すのは、控えたことが分かるようにするため（設計書 3.6.1.5 と同じ理屈で、
    // **何かが増えたのに黙っているのがいちばんまずい**）。
    if (sp.riddle && !this.player.grimoire.has(sp.riddle.id)
        && !this.player.riddles.has(sp.riddle.id)) {
      // 部屋の名も一緒に控える。戦闘中に開いたとき、何を見て書いたか分かるように
      this.player.riddles.set(sp.riddle.id, { mask: sp.riddle.mask, place: this.map.name });
      talk.push("（読めたところだけ、呪文帳の端に控えた）");
      sfx.play("learn");
      saveProgress(this.player);
    }

    // 読み終えたら潜る場所。扉ではないので、絵は出さない
    this.pendingWarp = sp.leadsTo ? { ...sp.leadsTo } : null;

    this.dialogue.open(sp, talk);
    this.lastTalkedMira = target.ref === "mira";

    const last = i === sp.talks.length - 1;
    // 「また明日ね。」——ミラの話が尽きたら、第1章は終わる（設計書 2.3）
    if (this.lastTalkedMira && last) this.miraFarewell = true;
    // ボスは話し終えてから始まる。会話を閉じた瞬間が開戦
    this.pendingBattle = last && sp.battleAfter
      ? { ref: sp.battleAfter, cellKey: `${this.map.id}:npc:${target.ref}` }
      : null;
    // 勝てば渡すもの。負けたら main.ts が捨てる
    this.state.pendingReward = this.pendingBattle ? sp.reward ?? null : null;
  }

  /**
   * 第2章へ。**イベントシーンは作らない。**
   * 「また明日ね。」の直後に画面が炎上版へ切り替わり、彼女はもうどこにもいない。
   * 別れの場面を描かないことが、この物語の設計そのものである（設計書 2.3）。
   */
  private beginChapter2(): void {
    this.state.startChapter(2, this.player);
    this.map = getMap(this.state.mapId);
    this.fromX = this.state.x;
    this.fromY = this.state.y;
    this.stepT = 0;
    this.lastTalkedMira = false;
    this.openChapter();
    saveProgress(this.player);
  }

  /**
   * 別の部屋へ移る。扉を踏んだときと同じ手順を、会話からも使えるようにしたもの。
   * `onArrive` は通らない（隙間を抜けた先で、いきなり戦いが始まっては困る）。
   */
  private warpTo(to: NonNullable<Speaker["leadsTo"]>): void {
    sfx.play("door");
    this.state.mapId = to.map;
    this.state.x = to.x;
    this.state.y = to.y;
    // **向きを指定しないと、くぐった穴を向いたまま出る。**
    // そこで Enter を押すと、そのまま来た道を戻ってしまう
    if (to.facing) this.state.facing = to.facing;
    this.map = getMap(to.map);
    this.fromX = to.x;
    this.fromY = to.y;
    this.stepT = 0;
    this.checkOnEnter();
  }

  /**
   * 会話のたびにミラは別の部屋へ移る。
   *
   * **一巡するまで、同じ部屋へは戻らない。**
   * 「直前以外」から毎回引くだけだと、閲覧室と大書架を往復するだけで
   * 章が終わることがあった。第1章の役目は間取りを覚えさせることなので
   * （設計書 2.3）、4部屋に均等に行き渡らないと第2章で効かない。
   *
   * 順番そのものは巡回当番なので、一巡の中では成り行きでよい。
   */
  private moveMira(): void {
    const st = this.state;
    const all = ["ch1_reading", "ch1_desks", "ch1_stacks", "ch1_stairs"];

    let rooms = all.filter((id) => id !== st.miraRoom && !st.miraSeen.includes(id));
    if (rooms.length === 0) {
      // 一巡した。今いる部屋だけを持ち越して、また4部屋を回りはじめる
      st.miraSeen = [st.miraRoom];
      rooms = all.filter((id) => id !== st.miraRoom);
    }

    const next = rooms[Math.floor(Math.random() * rooms.length)] ?? st.miraRoom;
    st.miraRoom = next;
    st.miraSeen.push(next);
    this.lastTalkedMira = false;
  }

  private showNotice(text: string): void {
    this.notice = text;
    this.noticeT = 2.6;
  }

  // ── 描画 ──────────────────────────────────

  render(d: Display): void {
    d.clear();

    this.renderTiles(d);
    this.renderEntities(d);
    this.renderPlayer(d);
    // 炎の色は「絵に被せる」ので、光を足す前。順序を逆にすると光まで濁る
    if (this.state.burning) this.burn.renderTint(d);
    // 光は絵の上、UIの下。燭台のにじみと床の光だまりがここで乗る
    this.bloom.render(d, this.collectLights(), this.state.burning ? 0.10 : 0.05,
      this.state.burning ? "#e07a34" : "#c8792f");
    if (this.state.burning) this.burn.render(d);
    this.renderChrome(d);

    if (this.noticeT > 0 && !this.dialogue.active) {
      windowBox(d, 16, 214, SCREEN_W - 32, 26);
      d.textRich(this.notice, 28, 220, PAL.dim, PAL.accent);
    }

    if (this.itemOpen) this.renderItems(d);

    this.dialogue.render(d, this.images);
    if (this.grimoireOpen) {
      this.grimoire.render(d, 16, 26, SCREEN_W - 32, 184, this.player);
      d.textRight("↑↓ 選択　ESC とじる", SCREEN_W - 20, 214, PAL.hint);
    }

    // 章の扉はいちばん上。部屋も会話も、この幕の向こうにある
    this.title.render(d);
  }

  private renderTiles(d: Display): void {
    const stone = this.images["tiles.stone"];
    if (!stone) {
      // タイルセット未投入のあいだは手描きの矩形で全部描く
      for (let y = 0; y < this.map.h; y++) {
        for (let x = 0; x < this.map.w; x++) {
          this.drawTile(d, x, y, this.tileAt(x, y));
        }
      }
      return;
    }

    // 1層目：石床と石壁を全面に敷く
    this.renderWang(d, stone, WANG_STONE, (t) => t === "#", false);

    // 2層目：本棚。全て床の組み合わせ（index 0）は描かない
    const shelf = this.images["tiles.shelf"];
    if (shelf) this.renderWang(d, shelf, WANG_SHELF, (t) => t === "B", true);
    else this.forEachTile("B", (x, y) => this.drawTile(d, x, y, "B"));

    // 3層目：家具のスプライト
    this.renderProps(d);
  }

  /** 指定タイルのマスを走査する */
  private forEachTile(tile: Tile, fn: (x: number, y: number) => void): void {
    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) if (this.tileAt(x, y) === tile) fn(x, y);
    }
  }

  /**
   * Wang タイル層（設計書 7.4 / src/field/tileset.ts）。
   *
   * タイルセットは「頂点」で地形を定義するが、本作のマップは「マス」で持っている。
   * そこで**マスの中心を頂点とみなし、タイルを半マスずらして描く**。
   * こうすると境界がマスの境界に乗り、当たり判定と絵が一致する。
   * 画面端は外側を upper とみなして1枚はみ出して描く。
   *
   * @param skipEmpty 4隅すべてが lower のとき描かない。重ね貼りする層で使う
   */
  private renderWang(
    d: Display,
    sheet: HTMLImageElement,
    table: WangTable,
    isUpper: (t: Tile) => boolean,
    skipEmpty: boolean,
  ): void {
    const at = (x: number, y: number): number => {
      if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return skipEmpty ? 0 : 1;
      return isUpper(this.tileAt(x, y)) ? 1 : 0;
    };

    for (let y = -1; y < this.map.h; y++) {
      for (let x = -1; x < this.map.w; x++) {
        const idx =
          at(x, y) * 8 + at(x + 1, y) * 4 + at(x, y + 1) * 2 + at(x + 1, y + 1);
        if (skipEmpty && idx === 0) continue;
        const r = table[idx];
        if (!r) continue;
        d.spriteRect(
          sheet, r.sx, r.sy, r.w, r.h,
          ORIGIN_X + x * TILE + TILE / 2,
          ORIGIN_Y + y * TILE + TILE / 2,
        );
      }
    }
  }

  /** 家具のスプライト。無いものは手描きの矩形に落ちる */
  /**
   * この部屋の光源を集める。
   * 燭台が主光源。第2章では床のあちこちが燃えているので、光が増えて赤く寄る。
   */
  private collectLights(): Light[] {
    const out: Light[] = [];
    this.forEachTile("C", (x, y) => {
      out.push({
        x: ORIGIN_X + x * TILE + TILE / 2,
        y: ORIGIN_Y + y * TILE - 2,
        radius: 44,
        strength: 0.55,
        color: "#f0b83c",
      });
    });
    // 禁書は自分で光っている
    for (const e of this.map.entities) {
      if (e.kind !== "vault") continue;
      out.push({
        x: ORIGIN_X + e.x * TILE + TILE / 2,
        y: ORIGIN_Y + e.y * TILE + TILE / 2,
        radius: 60,
        strength: 0.45,
        color: "#c8912f",
      });
    }
    return out;
  }

  private renderProps(d: Display): void {
    // 写字机は2マス幅。横に連なるマスの先頭から2マスおきに置く。
    // **絵は2種を交互ではなく、位置で散らす。**
    // 交互だと縞に見えるので、座標から作った擬似乱数で選ぶ（毎フレーム同じ絵になる）
    const desks = [this.images["prop.desk"], this.images["prop.desk2"]];
    for (let y = 0; y < this.map.h; y++) {
      let runStart = -1;
      for (let x = 0; x <= this.map.w; x++) {
        const isDesk = x < this.map.w && this.tileAt(x, y) === "T";
        if (isDesk && runStart < 0) runStart = x;
        if (!isDesk && runStart >= 0) {
          // 上の段にも机があるなら、そちらが先頭。ここでは描かない
          if (this.tileAt(runStart, y - 1) !== "T") {
            for (let i = runStart; i < x; i += 2) {
              // 64pxの机は2マス分。デザイン単位では TILE*2 に収まる
              const pick = desks[(i * 7 + y * 13) % 2] ?? desks[0];
              if (pick) d.sprite(pick, ORIGIN_X + i * TILE, ORIGIN_Y + y * TILE - 2);
              else d.rect(ORIGIN_X + i * TILE, ORIGIN_Y + y * TILE, TILE * 2, TILE * 2, this.col("#4a3826"));
            }
          }
          runStart = -1;
        }
      }
    }

    // 燭台。炎だけは手描きのまま重ねる。ゆらぐほうが書庫に合う
    const candle = this.images["prop.candle"];
    this.forEachTile("C", (x, y) => {
      const px = ORIGIN_X + x * TILE;
      const py = ORIGIN_Y + y * TILE;
      if (candle) d.spriteFoot(candle, px + TILE / 2, py + TILE + 4);
      const flick = 0.6 + 0.4 * Math.sin(this.time * 9 + x * 3 + y);
      d.ctx.globalAlpha = flick;
      d.rect(px + 7, py - 12, 2, 4, "#f0b83c");
      d.ctx.globalAlpha = flick * 0.22;
      d.rect(px - 2, py - 18, 20, 22, "#c8912f");
      d.ctx.globalAlpha = 1;
    });

    this.renderStairs(d);

    // カウンターは手描きのまま
    this.forEachTile("=", (x, y) => this.drawTile(d, x, y, "="));

    // 第2章で塞がれたマスに落ちた梁を置く
    if (this.state.burning) {
      const rubble = this.images["prop.rubble"];
      for (let y = 0; y < this.map.h; y++) {
        for (let x = 0; x < this.map.w; x++) {
          if (!this.state.isBlocked(this.map.id, x, y)) continue;
          const px = ORIGIN_X + x * TILE;
          const py = ORIGIN_Y + y * TILE;
          if (rubble) d.spriteFoot(rubble, px + TILE / 2, py + TILE + 4);
          else {
            d.rect(px + 1, py + 4, TILE - 2, 5, "#4a2a18");
            d.rect(px + 3, py + 9, TILE - 7, 4, "#33200f");
          }
        }
      }
    }
  }

  /**
   * 地下へ降りる階段。**手描きで組む。**
   *
   * 生成に3回投げて、3回とも「上へ昇る階段」か「真っ黒な板」になった。
   * 段が奥へ沈んでいく絵は、明度の並びがすべてなので、
   * 生成に任せるより数値で置いたほうが確実で、しかも palette と揃う。
   *
   * 手前の段がいちばん明るく、奥へ行くほど暗く、いちばん奥は真っ黒。
   * 穴の外周にも影を落として、床に開いた穴に見せる。
   */
  private renderStairs(d: Display): void {
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    this.forEachTile("V", (x, y) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    if (maxX < 0) return;

    const x0 = ORIGIN_X + minX * TILE;
    const y0 = ORIGIN_Y + minY * TILE;
    const w = (maxX - minX + 1) * TILE;
    const h = (maxY - minY + 1) * TILE;

    // 穴のまわりに落ちる影。床に開いた穴だと分かるように外へにじませる
    for (let i = 4; i >= 1; i--) {
      d.ctx.globalAlpha = 0.12 * (5 - i) / 4;
      d.rect(x0 - i, y0 - i, w + i * 2, h + i * 2, "#000000");
    }
    d.ctx.globalAlpha = 1;

    // 穴の中はまず真っ黒で埋める
    d.rect(x0, y0, w, h, "#05040a");

    // 段。
    //
    // **プレイヤーは下から乗り込む。** だから画面の下端が階段の入り口で、
    // 上へ行くほど地下へ潜っていく。手前（下）がいちばん明るく広く、
    // 奥（上）へ行くほど暗く狭い。
    //
    // ここを逆に描いていた。しかも「手前が明るい」とコメントしながら
    // いちばん明るい段を上に置き、その上から黒を被せていたので、
    // 絵として何を言いたいのか分からなくなっていた。
    const steps = 6;
    const stepH = h / steps;
    for (let i = 0; i < steps; i++) {
      // i=0 が最上段＝いちばん深い。near=1 がプレイヤーの側
      const near = (i + 1) / steps;
      const sy = Math.round(y0 + i * stepH);
      const sh = Math.round(stepH);
      // 奥ほど幅を詰めて、穴が上へすぼまって見えるようにする
      const inset = Math.round((1 - near) * (w * 0.14));
      const sx = x0 + inset;
      const sw = w - inset * 2;

      const shade = (base: number) => Math.round(base * (0.10 + 0.90 * near * near));
      const face = `rgb(${shade(122)},${shade(112)},${shade(96)})`;
      const nose = `rgb(${shade(196)},${shade(182)},${shade(156)})`;
      d.rect(sx, sy, sw, sh, this.col(face));
      // 段鼻。1本の明るい線が入るだけで、板ではなく段に見える
      d.rect(sx, sy, sw, 1, this.col(nose));
    }

    // いちばん奥（上端）は光が届かない
    d.ctx.globalAlpha = 0.85;
    d.rect(x0, y0, w, Math.round(stepH * 0.8), "#05040a");
    d.ctx.globalAlpha = 1;
  }

  private drawTile(d: Display, x: number, y: number, t: Tile): void {
    const px = ORIGIN_X + x * TILE;
    const py = ORIGIN_Y + y * TILE;

    const c = (hex: string) => this.col(hex);

    switch (t) {
      case "#":
        d.rect(px, py, TILE, TILE, c("#2a231d"));
        d.rect(px, py, TILE, 2, c("#3d332a"));
        break;
      case ".":
        d.rect(px, py, TILE, TILE, c((x + y) % 2 === 0 ? "#1b1714" : "#191512"));
        break;
      case "B": {
        d.rect(px, py, TILE, TILE, c("#3b2a1c"));
        // 背表紙。座標から決まるので毎フレーム同じ
        for (let i = 0; i < 4; i++) {
          const seed = (x * 31 + y * 17 + i * 7) % 5;
          const cols = ["#6a4b33", "#7a5340", "#4f5f52", "#6b5f4d", "#5a4058"];
          d.rect(px + 2 + i * 3, py + 3, 2, 11, c(cols[seed]!));
        }
        d.rect(px, py + TILE - 2, TILE, 2, c("#241a11"));
        break;
      }
      case "T":
        d.rect(px, py, TILE, TILE, c("#4a3826"));
        d.rect(px, py, TILE, 3, c("#5c4832"));
        break;
      case "C": {
        d.rect(px + 5, py + 6, 6, 10, c("#4a4038"));
        const flick = 0.6 + 0.4 * Math.sin(this.time * 9 + x * 3 + y);
        d.ctx.globalAlpha = flick;
        d.rect(px + 7, py + 2, 2, 4, "#f0b83c");
        d.ctx.globalAlpha = flick * 0.25;
        d.rect(px + 2, py - 2, 12, 12, "#c8912f");
        d.ctx.globalAlpha = 1;
        break;
      }
      case "=":
        d.rect(px, py, TILE, TILE, c("#3a3028"));
        d.rect(px, py, TILE, 2, c("#4c4034"));
        break;
      case "V":
        d.rect(px, py, TILE, TILE, c("#221d19"));
        for (let i = 0; i < 4; i++) d.rect(px, py + i * 4, TILE, 1, c("#3a3129"));
        break;
    }

  }

  private renderEntities(d: Display): void {
    for (const e of this.map.entities) {
      const px = ORIGIN_X + e.x * TILE;
      const py = ORIGIN_Y + e.y * TILE;

      if (e.kind === "door") {
        const img = this.images["prop.door"];
        if (img) {
          // 扉は壁の開口部に立つ。上へ伸びすぎないよう足元を少し下げるが、
          // 最下段の扉が下の帯に潜って土台が切れるので、そこで止める
          d.spriteFoot(img, px + TILE / 2, Math.min(py + TILE + 6, FOOTER_Y - 1));
        } else {
          d.rect(px, py, TILE, TILE, "#120f0d");
          d.rect(px + 6, py + 6, 4, 4, PAL.accent);
        }
        continue;
      }
      if (e.kind === "sign") {
        this.renderSign(d, px, py, e.look ?? "paper");
        continue;
      }

      if (e.kind === "vault") {
        // 台に置かれた、開かれたままの本
        const glow = 0.4 + 0.25 * Math.sin(this.time * 1.6);
        d.ctx.globalAlpha = glow * 0.5;
        d.rect(px - 4, py - 4, TILE + 8, TILE + 8, "#c8912f");
        d.ctx.globalAlpha = 1;
        d.rect(px + 1, py + 5, 14, 9, "#241d16");
        d.rect(px + 2, py + 6, 6, 7, "#d8cfb4");
        d.rect(px + 8, py + 6, 6, 7, "#d8cfb4");
        continue;
      }

      if (e.kind === "enemy") {
        if (this.state.defeated.has(`${this.map.id}:${e.x},${e.y}`)) continue;
        // その章に出ない敵は、シンボルごと出さない
        const ref = enemyRefFor(e, this.state.chapter);
        if (!ref) continue;
        const bob = Math.round(Math.sin(this.time * 4 + e.x) * 1.5);
        const mob = this.images[`mob.${ref}`];
        if (mob) {
          d.spriteFoot(mob, px + TILE / 2, py + TILE + SPRITE_FOOT + bob);
          continue;
        }
        const def = ENEMIES.find((x) => x.id === ref);
        d.rect(px + 2, py + 4 + bob, 12, 10, def?.sprite.color ?? "#7a3a34");
        d.frame(px + 2, py + 4 + bob, 12, 10, "#120f0d");
        continue;
      }

      if (!this.entityActive(e)) continue;

      // 待機モーションがあれば再生。無ければ静止画。どちらも無ければ矩形
      // （Phase 7 は差し替え途中でも動くようにしておく）
      // 会話IDと絵は1対1ではない。兵士は場面ごとに別IDだが、絵は同じもの
      const art = speaker(e.ref, this.state.chapter)?.sprite ?? e.ref;
      const loop = frames(this.images, `${art}.idle`);
      // NPCごとに位相をずらす。並んだときに同じ動きで揃うと不自然
      const phase = (e.x * 7 + e.y * 13) % 97;
      const img = loop.length > 0
        ? loop[Math.floor(this.time * IDLE_FPS + phase) % loop.length]
        : this.images[`${art}.south`];
      if (img) {
        // 48x48 のキャンバスを、足元がマスの下端に来るように置く
        d.spriteFoot(img, px + TILE / 2, py + TILE + SPRITE_FOOT);
        continue;
      }
      const sp = speaker(e.ref, this.state.chapter);
      d.rect(px + 3, py + 2, 10, 13, sp?.color ?? "#8a8a9a");
      d.rect(px + 3, py + 2, 10, 4, "#241a11");
    }
  }

  /**
   * 調べられる点。**紙・彫り・煤の3種を描き分ける**（設計書 3.8）。
   *
   * 全部おなじ紙の四角で描いていたころ、第3章の「床石に煤で書いた字」が
   * 床に落ちた紙に見えていた。石壁の彫り跡も、机の落書きも同じ絵だった。
   * 調べる物が一種類しか無いように見えると、部屋を見回す気にならない。
   *
   * 16px の中で見分けがつくよう、**輪郭の有無**で分けてある。
   * 紙は枠がある（置いてある物）、彫りと煤は枠が無い（面そのもの）。
   */
  private renderSign(d: Display, px: number, py: number, look: SignLook): void {
    if (look === "carve") {
      // 彫り跡。刻んだ線の下に明るい面が出るので、二段で立体に見える
      d.rect(px + 3, py + 6, 10, 1, "#241a11");
      d.rect(px + 3, py + 7, 10, 1, "#8a7b5e");
      d.rect(px + 5, py + 10, 6, 1, "#241a11");
      d.rect(px + 5, py + 11, 6, 1, "#8a7b5e");
      return;
    }
    if (look === "hole") {
      // 書架の裏の隙間。**暗いだけ。** 扉に見せない
      d.rect(px + 2, py + 5, 12, 10, "#0d0a09");
      d.rect(px + 2, py + 4, 12, 1, "#2a211a");
      d.rect(px + 3, py + 15, 10, 1, "#3a2f26");
      return;
    }
    if (look === "ash") {
      // 煤。輪郭を作らない。**擦れて薄いほど、それらしい**
      d.ctx.globalAlpha = 0.85;
      d.rect(px + 3, py + 7, 9, 2, "#17120f");
      d.rect(px + 6, py + 10, 6, 1, "#17120f");
      d.rect(px + 5, py + 5, 4, 1, "#17120f");
      d.ctx.globalAlpha = 0.5;
      d.rect(px + 2, py + 9, 3, 1, "#17120f");
      d.ctx.globalAlpha = 1;
      return;
    }
    // 紙。張り紙・巻物・反故紙。**枠があるのはこれだけ**
    d.rect(px + 3, py + 3, 10, 10, "#8a8070");
    d.frame(px + 3, py + 3, 10, 10, "#241a11");
    d.rect(px + 5, py + 6, 6, 1, "#4a4038");
    d.rect(px + 5, py + 9, 6, 1, "#4a4038");
  }

  private renderPlayer(d: Display): void {
    // 移動中は前のマスから補間する
    const k = this.stepT;
    const gx = this.state.x + (this.fromX - this.state.x) * k;
    const gy = this.state.y + (this.fromY - this.state.y) * k;
    const px = Math.round(ORIGIN_X + gx * TILE);
    const py = Math.round(ORIGIN_Y + gy * TILE);

    const dir = this.state.facing;
    const compass = COMPASS[dir];
    const walk = frames(this.images, `hero.walk.${compass}`);
    // 歩行サイクルは歩いているあいだだけ進む。止まれば立ち姿に戻る
    const img = this.stepT > 0 && walk.length > 0
      ? walk[Math.floor(this.walkPhase * WALK_FPS) % walk.length]
      : this.images[`hero.${compass}`] ?? walk[0];

    if (img) {
      d.spriteFoot(img, px + TILE / 2, py + TILE + SPRITE_FOOT);
      return;
    }

    // アセット未投入のあいだは矩形（Phase 7 は差し替え途中でも動く）
    d.rect(px + 3, py + 2, 10, 13, "#d8c8a0");
    d.rect(px + 3, py + 2, 10, 4, "#8a7a58");
    const f = DIRS[dir];
    d.rect(px + 7 + f.x * 4, py + 8 + f.y * 5, 2, 2, "#3a2f22");
  }

  /** 道具袋。画面の隅に小さく開く。歩いている絵を隠しきらない大きさにする */
  private renderItems(d: Display): void {
    const x = 300, y = 150, w = 164, h = 60;
    windowBox(d, x, y, w, h);
    ITEMS.forEach((kind, i) => {
      const ly = y + 10 + i * 16;
      const on = i === this.itemIdx;
      if (on) d.text("▸", x + 10, ly, PAL.accent);
      // 持っていないものも薄く消したりはしない。PAL.line は枠線用で、
      // 文字に使うと 1.51 の contrast になり**読めなくなる**（src/core/palette.ts）。
      // 数が 0 であることは「×0」が言っている
      d.text(
        `${ITEM_NAME[kind]}　×${this.player.items[kind]}　MP+${ITEM_MP[kind]}`,
        x + 24, ly, on ? PAL.ink : PAL.dim,
      );
    });
    d.text("ENTER 使う　I とじる", x + 10, y + h - 16, PAL.hint);
  }

  /**
   * 画面の上下の帯と、そこに乗る文字。
   *
   * **タイルの上に直接文字を置いていたので、模様と重なって読めなかった。**
   * 部屋は 26〜250 に描かれるが、Wangタイルは半マスはみ出して 18〜258 まで来る。
   * その上下を不透明な帯で覆い、文字はその中だけに置く。
   *
   * 帯は絵より後、会話ウィンドウより前に描く。
   */
  private renderChrome(d: Display): void {
    const p = this.player;

    d.rect(0, 0, SCREEN_W, HEADER_H, PAL.bg);
    d.rect(0, HEADER_H, SCREEN_W, 1, PAL.line);
    d.text(this.map.name, 18, 6, this.state.burning ? "#e07a34" : PAL.accent);
    d.textRight("TAB 呪文帳　I どうぐ　ENTER しらべる　ESC もどる", SCREEN_W - 16, 6, PAL.hint);

    d.rect(0, FOOTER_Y, SCREEN_W, SCREEN_H - FOOTER_Y, PAL.bg);
    d.rect(0, FOOTER_Y, SCREEN_W, 1, PAL.line);
    // 数字が無いと、あと何発撃てるのかが棒の長さでしか分からない
    d.text("HP", 18, 253, PAL.dim);
    bar(d, 36, 254, 70, 7, p.hp / p.maxHp, "#a8563f");
    d.text(`${p.hp}/${p.maxHp}`, 110, 253, PAL.ink);
    d.text("MP", 170, 253, PAL.dim);
    bar(d, 188, 254, 70, 7, p.mp / p.maxMp, "#3f6fa8");
    d.text(`${p.mp}/${p.maxMp}`, 262, 253, PAL.ink);
    d.textRight(`呪文帳 ${p.grimoire.size}　壺 ${p.items.ink}`, SCREEN_W - 16, 253, PAL.dim);
  }
}
