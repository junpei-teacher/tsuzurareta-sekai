# 守護樹の窪地 背景試作 v46

> 日付：2026-09-18  
> 状態：内蔵ImageGen生成・森パレット変換・実Scene二状態比較済み／v47として正式採用  
> 生成方式：Codex組込みImageGen

## 景観と物語上の役割

第二章の `guardian_hollow`。狩人の野営地から根洞窟へ移る境界である。左は野営地につながる白樺と青緑の森、右は一本の巨大な守護樹と、人ひとり通れる根の裂け目。森の古さは木や模様の数ではなく、一本の幹の尺度、大きな根の輪郭、低い窪地、入口前の余白で表す。

道の奥端は162、人物足元は176。裂け目は右寄りに置き、入口前へ主人公と調査表示を重ねられる。狩人頭の靴跡、外向きの魔物跡、入口を横切る細根、人物、会話、UIは静景へ焼き込まず動的層で描く。

## 保存物

| ファイル | 寸法 | bytes | SHA-256 |
|---|---:|---:|---|
| `guardian-hollow-imagegen-a-v46.png` | 1672×941 | 2,502,265 | `10b3f37d1c09957b7a46d329d6503aa22525f6a6f35f77fcc1209886bbad83e6` |
| `guardian-hollow-game-palette-v46-1x.png` | 480×270 | 257,201 | `0f15aca595ddcf4f075ea1f2ec07a8ffcc28992ea742c13f1710ffe2d5f2b291` |
| `guardian-hollow-game-palette-v46.png` | 960×540 | 307,685 | `32935d8908c8731925dbcf202550f700216307c7a7763b4b6e40de73cdd09fc8` |

## 変換と比較

`tools/prepare-guardian-hollow-v46.ts` は生成原本と正式森入口のハッシュ・寸法を確認し、原本の路面基準610をゲーム座標162へ対応させる。正式森背景の138色へ重み付きRGB距離で写像し、138色を使用。480×270から補間なしで整数2倍にする。`npm run verify:guardian-hollow-trial` でv47正式画像とのバイト一致まで確認できる。

DEV「背景　4地域比較」のJキーで、保存を変えない実SideViewScene比較へ入る。Gで画像／コード、Uで「根の裂け目を調べる」「根洞窟への入口」、Cで静景、Hで比較表示を切り替える。ブラウザで人物の接地、入口前の調査表示、靴跡と魔物跡、裂け目会話を確認した。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: original side-scrolling RPG environment background for “Yohaku no Mori”, scene “Guardian Tree Hollow”; landscape 16:9.
Input images: Image 1 is the adjacent Hunter Camp reference for palette, birch woodland continuity, road height, and material language only; do not copy its tent, bridge, crates, supplies, waterfall, or camp objects. Image 2 is the illustration-density reference: match its broad readable color shapes, restrained clustered shading, clean silhouettes, and low visual noise; do not copy its open meadow layout.
Primary request: A quiet old-growth hollow just beyond the hunters’ camp, where the forest’s colossal guardian tree rises on the right. The place should feel ancient, protective, and faintly unsettling, expressed through shape, scale, cool color, and negative space rather than extra detail or photorealism.
Scene/backdrop: On the left, a few pale birches and a teal forest path continue naturally from Image 1. Toward the center-right, one enormous ancient tree dominates the scene with a wide trunk and massive buttress roots. At x≈390/480, the roots form a narrow person-sized dark fissure leading into a root cavern. The fissure is visible but not magical; leave clear ground before it for an investigation overlay. A shallow bowl of mossy earth and exposed roots defines the hollow. No camp remains.
Style/medium: Original handmade colorful pixel-art illustration; crisp square pixels, larger deliberate color clusters, clean readable contours, gently storybook-like. Use two-to-four-tone shading on bark, moss, roots, and soil. Prioritize shapes over surface detail.
Composition/framing: Strict flat side-view stage for a 480x270 game canvas. A continuous nearly horizontal walkable strip reaches from the left edge to the root fissure and right exit; far edge near y≈162/270, character feet at y≈176/270. Keep y=162–180 clear of large roots and props. Reserve x≈390 for the fissure, footprint overlays, and an interacting hero. The giant tree may frame the upper-right but must not cover gameplay UI regions with excessive contrast. Traversable exits at both edges.
Lighting/mood: Cool filtered late-afternoon forest light, muted turquoise mist in the distance, a restrained warm olive-brown on the near soil and roots. Sacred and watchful, not horror, not glowing fantasy spectacle.
Color palette: Deep moss and pine green, teal haze, pale birch ivory, warm subdued earth and root brown, tiny muted old-gold accents. Keep the same world palette as the references.
Constraints: scenery only; no people, creatures, animals, hunters, footprints, active effects, magical barrier, runes, readable writing, signs, UI, text, watermark, or border. No photorealism, film grain, noisy stippling, dense micro-dithering, hyper-detailed bark, smooth airbrushing, or antialiasing. No buildings or East Asian architectural shapes.
Output intent: one production-minded background candidate with strong illustration balance, not a cinematic painting.
```

