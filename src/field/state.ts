/**
 * フィールドの継続状態。
 * マップ遷移や戦闘をまたいで保持する。
 */
export class FieldState {
  mapId = "ch1_reading";
  x = 14;
  y = 6;
  facing: "up" | "down" | "left" | "right" = "down";

  /**
   * ミラが今どの部屋にいるか。
   * 会話を終えるたびに別の部屋へ移る。第1章では彼女を探して歩くことになる。
   */
  miraRoom = "ch1_reading";

  /** 倒した敵シンボル。`mapId:x,y` で記録する */
  defeated = new Set<string>();

  /** NPCごとの会話の進み具合 */
  talkIndex = new Map<string, number>();

  nextTalk(id: string, total: number): number {
    const i = this.talkIndex.get(id) ?? 0;
    // 最後まで行ったら最後の1つを繰り返す
    this.talkIndex.set(id, Math.min(i + 1, total - 1));
    return Math.min(i, total - 1);
  }
}
