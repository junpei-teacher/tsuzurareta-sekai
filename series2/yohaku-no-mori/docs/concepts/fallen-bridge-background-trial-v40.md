# 落ちた橋 背景試作 v40

> 日付：2026-09-15  
> 状態：内蔵ImageGen生成・森パレット変換・実Scene三状態比較済み／2026-09-15にv41として正式採用  
> 生成方式：Codex組込みImageGen

以下の未登録・未採用の記述はv40試作時点の履歴。現在の本編採用は `fallen-bridge-background-adoption-v41.md` を参照。

## 景観と物語上の役割

第二章の `fallen_bridge`。罠の道を抜け、記憶を一瞬失わせる蛾と向き合い、右岸の切れた橋綱に残るセナの二重結びを見つける場所。橋桁は通行可能で、失われたのは手すりの一部。ゲーム上の連続歩行と「落ちた橋」という名前を両立させる。人物足元は176、橋面はその前後に置く。蛾・結び目・会話・UIは静景に焼き込まず動的層で描く。

## 保存物

| ファイル | 寸法 | bytes | SHA-256 |
|---|---:|---:|---|
| `fallen-bridge-imagegen-a-v40.png` | 1672×941 | 2,853,342 | `895cb360d78175424d170a455f295f6376c63c983a2cb6d90ab90d9cef756c8c` |
| `fallen-bridge-game-palette-v40-1x.png` | 480×270 | 246,208 | `a9bb5f6ecc22a5299455564f49ca1e7e3a173d7fd911878c9629a58ed6fb99a5` |
| `fallen-bridge-game-palette-v40.png` | 960×540 | 279,139 | `86a5a63a96ae8ae123ef07cde75b53961ed9e17f041ad8c32ade35509d1d44e6` |

## 変換と比較

`tools/prepare-fallen-bridge-v40.ts` は原本と正式森入口のハッシュ・寸法を確認し、原本の路面基準480をゲーム座標162へ対応させる。森背景の138色パレットへ同じ重み付きRGB距離で写像し、135色を使用。480×270から補間なしで整数2倍にする。`npm run verify:fallen-bridge-trial` で再現できる。

DEV「背景　4地域比較」のYキーで、保存を変えない実SideViewScene比較へ入る。Gで画像／コード、Uで「蛾との対峙」「橋綱の発見」「結び目を記憶」を切り替える。ブラウザで三状態を確認し、橋綱調査の本編会話も開けた。景観、人物の接地、右岸の調査点が整合する。正式Manifestには未登録で、通常進行は従来のコード景観。今後、通常導線での蛾戦から橋綱発見、野営地への開通を確認して採用判断をする。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: original side-scrolling RPG environment background for “Yohaku no Mori”, scene “Fallen Bridge”; landscape 16:9.
Primary request: An old forest footbridge whose rope railing has fallen, on the route beyond an overgrown hunter’s snare path. The crossing hints at a brief lapse of memory, but remains a believable place to walk and investigate.
Scene/backdrop: Temperate teal-green woodland with silver birches, dark mossy banks and distant bluish ravine mist. A weathered timber deck and missing or hanging rail ropes cross a shallow narrow ravine in side profile. The damaged planks and rope stubs show age and repair, not a catastrophic gap. The right-side rope end is clearly visible as a place where a small knot will be drawn later, but do not depict an actual knot.
Style/medium: Original handmade colorful pixel-art environmental illustration, crisp square pixels and purposeful color clusters, rich but controlled texture, no smooth airbrushing, no antialiasing.
Composition/framing: Strict flat side-view game stage for 480x270 canvas, wide horizontal. A continuous traversable walking surface reaches all the way from left edge to right edge; far edge of the path/deck at game y≈162/270 and player feet at y≈176/270. Bridge/deck may be the distinct center feature but must connect seamlessly to soil paths on both sides without any impassable gap or steep slope. The ravine is behind and below the walkable band, not a hole through it. Keep x≈170 clear enough for a wide floating moth enemy drawn later; reserve x≈344 right of center for a small inspectable rope-knot overlay. No subjects are baked into the scenery.
Lighting/mood: Filtered afternoon light, moist air, a trace of lavender-gray in the ravine haze to signal forgetfulness without magical glow. Keep nearby soil and timber warm enough to read character feet.
Color palette/materials: Deep forest greens, birch ivory, teal mist, warm brown worn wood and rope; consistent with vivid pastoral forest backgrounds of this original game.
Constraints: scenery only; no people, moths, active effects, knots, written signs, UI, text, watermark or border. No East Asian buildings or gate shapes.
```
