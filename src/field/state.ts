import rawCh2 from "../../data/maps/ch2.json";
import type { Player } from "../game/player.ts";

type MapDiff = { block?: number[][]; open?: number[][]; note?: string };
const CH2 = rawCh2 as unknown as Record<string, MapDiff>;

/** 章ごとの開始条件（設計書 2.7 / 4.5） */
const CHAPTERS = [
  null,
  { level: 1, map: "ch1_reading", x: 14, y: 6, ink: 3, drop: 1 },
  { level: 4, map: "ch1_reading", x: 14, y: 6, ink: 2, drop: 1 },
  { level: 8, map: "ch1_stairs", x: 12, y: 11, ink: 2, drop: 1 },
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

  get burning(): boolean {
    return this.chapter >= 2;
  }

  /** 第2章の差分：瓦礫で塞がれたマス */
  isBlocked(mapId: string, x: number, y: number): boolean {
    if (!this.burning) return false;
    return (CH2[mapId]?.block ?? []).some((c) => c[0] === x && c[1] === y);
  }

  /** 第2章の差分：崩れて通れるようになったマス */
  isOpened(mapId: string, x: number, y: number): boolean {
    if (!this.burning) return false;
    return (CH2[mapId]?.open ?? []).some((c) => c[0] === x && c[1] === y);
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
      this.intro = [];
    }
  }
}
