# 根洞窟入口 背景試作 v48

> 日付：2026-09-18  
> 状態：内蔵ImageGen生成・森パレット変換・実Scene三状態比較済み／v49として正式採用  
> 生成方式：Codex組込みImageGen

## 景観と物語上の役割

第二章の `root_hollow_entry`。守護樹の裂け目を抜けて初めて入る地下景観で、反響標による試し打ち、罠喰い蔓による最初の通行止め、反響回廊への開通を一画面で扱う。左の外光と根の内側で直前の守護樹につなぎ、右の青緑の岩と暗い根でダンジョンの奥行きを予告する。

路面上端は162、人物足元は176。x98の反響標、x224の罠喰い蔓、人物、ほどけた蔓、反響光、会話、UIは静景へ焼き込まず動的層で描く。地下だから描き込みを増やすのではなく、大きな根・丸い岩面・青緑と琥珀の色温度差で深さを表す。

## 保存物

| ファイル | 寸法 | bytes | SHA-256 |
|---|---:|---:|---|
| `root-hollow-entry-imagegen-a-v48.png` | 1672×941 | 2,406,108 | `cbc74197dba69710c133a78cfea96f9244d4c27017ca9139058b977afcef3391` |
| `root-hollow-entry-game-palette-v48-1x.png` | 480×270 | 243,758 | `7ccc4a6fd0b32174040147982a4e58eb3d713e94e78eb457db0a93304b44a770` |
| `root-hollow-entry-game-palette-v48.png` | 960×540 | 299,692 | `6587471458a1fc64212c64f09c0fef8ee5debde10c9c348618d2855b102b9dfa` |

## 変換と比較

`tools/prepare-root-hollow-entry-v48.ts` は生成原本と正式森入口のハッシュ・寸法を確認し、原本の路面基準570をゲーム座標162へ対応させる。正式森背景の138色へ重み付きRGB距離で写像し、129色を使用。480×270から補間なしで整数2倍にする。`npm run verify:root-hollow-entry-trial` でv49正式画像とのバイト一致まで確認できる。

DEV「背景　4地域比較」のNキーで、保存を変えない実SideViewScene比較へ入る。Gで画像／コード、Uで「反響標で試し打ち」「蔓との対峙」「反響回廊が開通」、Cで静景、Hで比較表示を切り替える。ブラウザで正式背景とコードfallback、人物・反響標・蔓の接地、攻略後も標が残ること、右の通路が読めることを確認した。

## 実送信プロンプト

```text
Create a brand-new side-view exploration background for a Japanese fantasy RPG titled "余白の森". This is the first underground room, reached by walking through the split roots of the enormous guardian tree shown in reference image 1. Use the references only for the established palette, pixel scale, storybook atmosphere, and visual continuity; do not copy their composition.

Scene: an underground root-and-stone corridor beneath an ancient forest. The left edge feels like the inside of the guardian tree's hollow entrance, with a faint cool daylight glow filtering from behind. Massive pale-brown and moss-dark roots arch overhead and merge into rounded blue-green cavern rock. A broad corridor continues into deeper darkness at the right edge. Damp mineral surfaces catch a few restrained turquoise and warm amber reflections, so it remains colorful rather than monochrome. It should feel old, quiet, safe enough to practice magic, yet clearly the threshold of a dungeon.

STRICT GAME COMPOSITION:
- Landscape 16:9 side-view game background, intended for 480x270 and nearest-neighbor display at 960x540.
- Camera is straight side-on with no dramatic perspective tilt.
- A single flat, continuous, clearly walkable ground strip crosses the full width. Its top must sit at about 60% of image height (design y≈162/270), with character feet at y≈176/270.
- Keep the entire walk strip from x≈45 to x≈285 visually open and low-detail. Reserve especially clean negative space around x≈98 for a repeatable practice target, and x≈224 for a living vine enemy. These objects will be added by game code: DO NOT draw them.
- Leave the rightward path readable and unobstructed beyond x≈278.
- No stairs, pits, deep water, ledges, foreground boulders, or roots crossing the walk strip.
- Foreground detail may frame only the bottom edge, never obscure characters.

ART DIRECTION:
- Colorful hand-crafted 16-bit-era storybook pixel-art illustration, not a photo and not realistic concept art.
- Use broad readable shapes, clear silhouettes, restrained texture, and 2–4 tone cel-like shading per material.
- Moderate chunky pixel clusters, coherent painterly pixels, low visual noise. The final palette conversion will reduce it to the game's forest palette.
- Deeper dungeon means darker and older shapes, NOT more photographic detail.
- Preserve the rich teal, moss, ochre, and soft-cyan family of the references, adding only restrained amber glints.
- No excessive grain, no micro-dithering everywhere, no glossy PBR rock, no cinematic photorealism, no razor-sharp high-frequency detail.

DO NOT INCLUDE: characters, creatures, enemies, practice target, training dummy, snare vines, magical glyphs, readable runes, text, signs, UI, inventory items, treasure chests, weapons, buildings, doors, columns, ruins, torches, artificial architecture, or baked-in gameplay markers.
```

