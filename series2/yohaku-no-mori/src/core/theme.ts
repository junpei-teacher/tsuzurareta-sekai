/**
 * 土地ごとの環境色。
 *
 * UIの可読色は palette.ts に固定し、こちらはフィールド・戦闘背景・大気だけを変える。
 * 戦闘ロジックへ ThemeId を渡してはならない。見た目だけの文脈である。
 */
export type ThemeId = "village" | "forest" | "ruin";

export type VisualTheme = {
  skyTop: string;
  skyBottom: string;
  ambient: string;
  shadow: string;
  ground: string;
  groundLight: string;
  foliage: string;
  foliageLight: string;
  fog: string;
  glow: string;
};

export const THEMES: Record<ThemeId, VisualTheme> = {
  village: {
    skyTop: "#315d65",
    skyBottom: "#8cb7ae",
    ambient: "#d8c994",
    shadow: "#17342d",
    ground: "#675b3e",
    groundLight: "#a38c58",
    foliage: "#456a4c",
    foliageLight: "#7e9d62",
    fog: "#b8d1bf",
    glow: "#e2bd68",
  },
  forest: {
    skyTop: "#0a211e",
    skyBottom: "#1d4840",
    ambient: "#78b6a1",
    shadow: "#06110f",
    ground: "#263d30",
    groundLight: "#46634a",
    foliage: "#173b32",
    foliageLight: "#548264",
    fog: "#6d9d8e",
    glow: "#76d8c1",
  },
  ruin: {
    skyTop: "#111526",
    skyBottom: "#273148",
    ambient: "#8c9ec3",
    shadow: "#080a12",
    ground: "#343d50",
    groundLight: "#58677f",
    foliage: "#202c37",
    foliageLight: "#486463",
    fog: "#8492ae",
    glow: "#b9a9e6",
  },
};
