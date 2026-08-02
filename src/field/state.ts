import rawCh2 from "../../data/maps/ch2.json";
import type { Player } from "../game/player.ts";

type MapDiff = { block?: number[][]; open?: number[][]; openAfter?: string; note?: string };
const CH2 = rawCh2 as unknown as Record<string, MapDiff>;

/** 章ごとの開始条件（設計書 2.7 / 4.5） */
const CHAPTERS = [
  null,
  { level: 1, map: "ch1_reading", x: 14, y: 6, ink: 3, drop: 1 },
  { level: 4, map: "ch1_reading", x: 14, y: 6, ink: 2, drop: 1 },
  // 第3章は階段を降りた先から。禁書庫はその奥、灰の広間を抜けた先にある
  { level: 8, map: "ch3_descent", x: 13, y: 12, ink: 2, drop: 1 },
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

  /** 倒した敵シンボル。`mapId:x,y` で記録する */
  defeated = new Set<string>();

  /** NPCごとの会話の進み具合 */
  talkIndex = new Map<string, number>();


  /** 章の入り口で一度だけ出す文章。表示したら消す */
  intro: string[] = [];

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
   * 階段は封が焼け落ちてはいるが、焼けた本の山が積まれていて降りられない。
   * 「降りるしか残っていない」状況を作るには、降り口に代償が要る。
   */
  isOpened(mapId: string, x: number, y: number): boolean {
    if (!this.burning) return false;
    const diff = CH2[mapId];
    if (!diff?.open?.some((c) => c[0] === x && c[1] === y)) return false;
    if (diff.openAfter && !this.defeated.has(diff.openAfter)) return false;
    return true;
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

    player.setLevel(c.level);
    player.restore();
    player.items = { ink: c.ink, drop: c.drop };

    if (n === 2) {
      // イベントシーンは作らない。気づいたら、いないだけ（設計書 2.3）
      this.miraRoom = "";
      this.intro = [
        "煙の匂いで、目が覚めた。",
        "書架のあいだを、赤い光が走っている。",
        "……ミラ。",
      ];
    } else if (n === 1) {
      this.miraRoom = "ch1_reading";
      this.intro = [];
    } else {
      this.miraRoom = "";
      this.intro = [
        "階段は、思っていたより長かった。",
        "降りきったところに、扉はなかった。",
        "部屋があるだけだった。",
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
    this.startChapter(this.chapter, player);
    this.talkIndex = talks;
    if (mira) this.miraRoom = mira;
    this.intro = [
      "目が覚めた。",
      "どれくらい倒れていたのか、分からない。",
      "書架のあいだは、まだ同じ夜だった。",
    ];
  }
}
