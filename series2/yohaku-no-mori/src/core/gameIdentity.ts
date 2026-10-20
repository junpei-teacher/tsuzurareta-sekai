/**
 * 作品固有の表示名と保存領域。
 *
 * シリーズ1と同一オリジンで動かしても、セーブ・主人公名・音量設定を
 * 混ぜないため、作品ごとに必ず別の prefix を持つ。
 */
export const GAME_IDENTITY = {
  seriesTitle: "綴られた世界",
  subtitle: "余白の森",
  fullTitle: "綴られた世界 ―余白の森―",
  storagePrefix: "yohaku-no-mori",
} as const;
