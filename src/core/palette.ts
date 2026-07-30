// 全画面で共通のパレット。
// アセットを入れる Phase 7 でも、この色数に収める（設計書 8.1）。

export const PAL = {
  bg:      "#14100f", // 書庫の闇
  panel:   "#1f1a17",
  line:    "#3b322a",
  ink:     "#e8dcc0", // 主要テキスト
  dim:     "#6b5f4d", // 補助テキスト
  accent:  "#c8912f", // 燭台の火
  danger:  "#b0463a",
} as const;

/** レア度帯の表示色 */
export const TIER_COLOR = {
  DUD:      "#5a5148",
  COMMON:   "#8fae95",
  UNCOMMON: "#7fa8d8",
  RARE:     "#c08fd8",
  MYTH:     "#f0b83c",
} as const;
