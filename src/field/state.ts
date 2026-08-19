import rawCh2 from "../../data/maps/ch2.json";
import type { Player } from "../game/player.ts";
import { enemyRefFor, getMap } from "./mapFormat.ts";
import type { TitleCard } from "../ui/chapterTitle.ts";
import type { Reward } from "../ui/dialogue.ts";

type MapDiff = {
  block?: number[][];
  open?: number[][];
  openAfter?: string;
  clearMaps?: string[];
  note?: string;
};
const CH2 = rawCh2 as unknown as Record<string, MapDiff>;

/**
 * 章の扉に出す題（設計書 2.7）。
 * 副題は場所ではなく、その章でプレイヤーがしていることを指す。
 */
const TITLES: Record<number, TitleCard> = {
  1: { main: "第一章", sub: "静かな書庫" },
  2: { main: "第二章", sub: "燃える夜" },
  3: { main: "第三章", sub: "最下層" },
};

/** 第2章にその部屋へ出る敵シンボルの位置キー。倒したかの判定に使う */
function enemyCells(mapId: string): string[] {
  const out: string[] = [];
  for (const e of getMap(mapId).entities) {
    if (e.kind !== "enemy") continue;
    if (!enemyRefFor(e, 2)) continue;
    out.push(`${mapId}:${e.x},${e.y}`);
  }
  return out;
}

/**
 * 章ごとの開始条件（設計書 4.5）。
 *
 * **レベルは無い。** 体力は章の切れ目で一段だけ上がり、章のなかでは動かない。
 * 戦闘に勝っても増えるのは呪文帳だけである。
 *
 * 補給は npm run balance で詰めた値。
 */
const CHAPTERS = [
  null,
  { map: "ch1_reading", x: 14, y: 6, hp: 30, mp: 90, ink: 3, drop: 0 },
  { map: "ch1_reading", x: 14, y: 6, hp: 70, mp: 140, ink: 3, drop: 1 },
  // 第3章は階段を降りた先から。禁書庫はその奥、灰の広間を抜けた先にある
  { map: "ch3_descent", x: 13, y: 12, hp: 150, mp: 200, ink: 3, drop: 2 },
] as const;

/**
 * フィールドの継続状態。
 * マップ遷移や戦闘をまたいで保持する。
 */
export class FieldState {
  chapter = 1;
  mapId = "ch1_reading";
  x = 14;
  y = 6;
  facing: "up" | "down" | "left" | "right" = "down";

  /**
   * ミラが今どの部屋にいるか。
   * 会話を終えるたびに別の部屋へ移る。第1章では彼女を探して歩くことになる。
   * 第2章以降、彼女はどこにもいない。
   */
  miraRoom = "ch1_reading";

  /**
   * 今の一巡で、彼女がすでに居た部屋。
   *
   * **行き先を毎回ランダムに選ぶと、同じ部屋が続けて当たる。**
   * 4部屋から「直前以外」で引くだけだと、運が悪いと閲覧室・大書架・閲覧室・大書架
   * と往復するだけになり、あとの2部屋には一度も用が無いまま章が終わる。
   * プレイヤーに間取りを覚えさせるのが第1章の役目（設計書 2.3）なので、
   * それでは第2章で効かない。
   *
   * 一巡するまで同じ部屋へは戻らない。4部屋を回りきったら、また空にする。
   */
  miraSeen: string[] = [];

  /** 倒した敵シンボル。`mapId:x,y` で記録する */
  defeated = new Set<string>();

  /** NPCごとの会話の進み具合 */
  talkIndex = new Map<string, number>();


  /** 章の入り口で一度だけ出す文章。表示したら消す */
  intro: string[] = [];

  /** 章の扉。表示したら消す。負けてのやり直しでは出さない */
  titleCard: TitleCard | null = null;

  /**
   * 戦闘に勝ったら渡すもの。**負けたら捨てる。**
   *
   * フィールドの場面は戦闘のたびに作り直されるので、
   * 「勝った直後に何かを渡す」という情報はここに預けて跨がせる。
   */
  pendingReward: Reward | null = null;

  /**
   * 燃えているのは**第2章だけ**。
   *
   * 第3章は最下層で、火はまだ上にある。ここを `>= 2` にしていると
   * 地下まで橙色になり、**燃える書庫と静かな禁書庫の対比が消える。**
   */
  get burning(): boolean {
    return this.chapter === 2;
  }

  /** 第2章の差分：瓦礫で塞がれたマス */
  isBlocked(mapId: string, x: number, y: number): boolean {
    if (!this.burning) return false;
    return (CH2[mapId]?.block ?? []).some((c) => c[0] === x && c[1] === y);
  }

  /**
   * 第2章の差分：崩れて通れるようになったマス。
   *
   * `openAfter` を持つ部屋は、**そこに書かれた相手を倒すまで開かない。**
   * さらに `clearMaps` があれば、**その階に残る魔物を全て倒すまで開かない。**
   *
   * 灰の中の声だけ倒せば降りられると、階段までまっすぐ歩いて第2章が終わる。
   * ミラを探して階を歩き回った、という時間が残らない。
   */
  isOpened(mapId: string, x: number, y: number): boolean {
    if (!this.burning) return false;
    const diff = CH2[mapId];
    if (!diff?.open?.some((c) => c[0] === x && c[1] === y)) return false;
    if (diff.openAfter && !this.defeated.has(diff.openAfter)) return false;
    if (diff.clearMaps && this.remaining(diff.clearMaps) > 0) return false;
    return true;
  }

  /** まだ倒していない敵シンボルの数 */
  remaining(mapIds: string[]): number {
    let n = 0;
    for (const id of mapIds) {
      for (const key of enemyCells(id)) if (!this.defeated.has(key)) n++;
    }
    return n;
  }

  /**
   * その階段が今なぜ降りられないのか。降りられるなら undefined。
   * 通せんぼするだけで理由を言わないと、プレイヤーは進行不能だと思う。
   */
  stairsReason(mapId: string): string | undefined {
    const diff = CH2[mapId];
    if (!this.burning || !diff?.open) return undefined;
    if (diff.openAfter && !this.defeated.has(diff.openAfter)) {
      return "焼けた本の山が、階段を塞いでいる。";
    }
    const left = diff.clearMaps ? this.remaining(diff.clearMaps) : 0;
    if (left > 0) {
      return `降り口の熱が引かない。この階に、まだ ${left} つ 息をしている。`;
    }
    return undefined;
  }

  nextTalk(id: string, total: number): number {
    const i = this.talkIndex.get(id) ?? 0;
    // 最後まで行ったら最後の1つを繰り返す
    this.talkIndex.set(id, Math.min(i + 1, total - 1));
    return Math.min(i, total - 1);
  }

  /**
   * 章を開始する。HP/MP を全回復し、レベルを設定する（設計書 5章）。
   * 章内が一つの勝負単位になる。
   */
  startChapter(n: number, player: Player): void {
    const c = CHAPTERS[n];
    if (!c) return;

    this.chapter = n;
    this.mapId = c.map;
    this.x = c.x;
    this.y = c.y;
    this.facing = "down";
    this.defeated.clear();
    this.talkIndex.clear();

    player.setBody(c.hp, c.mp);
    player.restore();
    player.items = { ink: c.ink, drop: c.drop };
    this.pendingReward = null;
    this.titleCard = TITLES[n] ?? null;

    if (n === 2) {
      // **イベントシーンは作らない。気づいたら、いないだけ**（設計書 2.3）。
      // 火を見せ、命令の声を聞かせ、逃げ道が塞がったことを示す。
      // 彼女がいないことは、最後に一行置くだけにする
      this.miraRoom = "";
      this.intro = [
        "煙の匂いで、目が覚めた。",
        "机に伏せたまま眠っていたらしい。筆が、床に落ちている。",
        "書架のあいだを、赤い光が走っている。",
        "廊下の向こうで、誰かが命令を復唱している。",
        "書庫を焼きに来た者がいる。",
        "東の扉は、焼け落ちた梁で塞がっていた。",
        "……ミラ。",
        "呼んでみたが、返事はない。",
      ];
    } else if (n === 1) {
      this.miraRoom = "ch1_reading";
      this.miraSeen = ["ch1_reading"];
      // **第1章にも状況説明を置く。**
      // 第2章・第3章には章頭の地の文があるのに、第1章だけ何も無く、
      // 署名を書き終えた人が、いきなり書庫に立たされていた。
      // 何をする夜なのかと、話しかける相手が二人いることだけ伝える
      this.intro = [
        "今日も、いつもと同じ夜だ。",
        "返却された本を棚に戻し、題名を目録に書き写す。",
        "それが朝まで続く。",
        "巡回の当番は、ミラと二人。",
        "司書長は、たいてい閲覧室にいる。",
        "……まずは、誰かに声をかけてみよう。",
      ];
    } else {
      this.miraRoom = "";
      this.intro = [
        "階段は、思っていたより長かった。",
        "降りるほど空気が冷たくなり、煙の匂いが遠のいていく。",
        "上の火は、ここまで届いていない。",
        "降りきったところに、扉はなかった。",
        "部屋があるだけだった。",
        "壁も床も、書架さえ、石を彫って作られている。",
        "運び込んだのではない。ここで彫ったのだ。",
        "誰にも持ち出させないために。",
      ];
    }
  }

  /**
   * 負けたときのやり直し。
   *
   * 章の頭からやり直す（設計書 5：章内が一つの勝負単位）。HPもMPも道具も戻り、
   * 倒した敵は復活する。**そのかわり、ミラとの会話の進み具合と呪文帳は残す。**
   *
   * 話の続きまで巻き戻すと、負けた罰が「同じ会話をもう一度読む」になってしまう。
   * それは罰ではなく、ただの苦行である。
   *
   * 死んだのではない。目の前が白くなって、目が覚めただけ。
   */
  restartChapter(player: Player): void {
    const talks = new Map(this.talkIndex);
    const mira = this.miraRoom;
    // 巡回の途中経過も残す。**負けたら彼女が最初の部屋へ戻る**のでは、
    // 会話の進み具合を残した意味が半分になる
    const seen = [...this.miraSeen];
    this.startChapter(this.chapter, player);
    this.talkIndex = talks;
    if (mira) { this.miraRoom = mira; this.miraSeen = seen; }
    // やり直しのたびに章の扉を見せられるのは、罰ではなく苦行になる
    this.titleCard = null;
    this.intro = [
      "目が覚めた。",
      "どれくらい倒れていたのか、分からない。",
      "書架のあいだは、まだ同じ夜だった。",
    ];
  }
}
