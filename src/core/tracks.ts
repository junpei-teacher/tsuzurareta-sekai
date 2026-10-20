/**
 * 曲IDと実ファイルの対応。
 *
 * - 文字列: その曲へクロスフェードする
 * - null: 現在の曲を継続する
 * - false: クロスフェードで無音へ移る
 */
export type TrackSource = string | null | false;
export type TrackManifest = Readonly<Record<string, TrackSource>>;

/**
 * シリーズ2本番用Manifest。
 * 完成BGMが入るまでは無音だが、旧作BGMへ暗黙にフォールバックしない。
 */
export const SERIES2_TRACKS = {
  title: false,
  prologue: null,
  village: null,
  forest: null,
  ruin: null,
  battle: null,
  boss: null,
  ending: null,
  silence: false,
} as const satisfies TrackManifest;

