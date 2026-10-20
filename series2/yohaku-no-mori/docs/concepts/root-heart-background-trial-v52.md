# 守護樹心部の背景試作 v52

> 実施日：2026-09-18  
> 生成方式：Codex組込みImageGen  
> 判定：初稿Aを選定。v53の正式背景へ派生

## 目的

反響回廊の先にある第一ボス部屋 `root_heart` を、根の番人x302、狩人頭x388、足元176、会話窓開始182の実配置で成立させる。背景へ番人、狩人、折れた弓、白根の杖を焼き込まず、戦闘前・戦闘後・救出後を一枚の静景で共有する。

## 入力画像

- Image 1：`src/assets/series2/backgrounds/echo_gallery/middle.png`。直前の隣接景観、青緑の洞窟色、ピクセル尺度、描画密度の参照。
- Image 2：`src/assets/series2/backgrounds/guardian_hollow/middle.png`。地上の守護樹の形、太い根の曲線、絵画的なピクセル質感の参照。
- いずれも本作内の正式素材。第三者画像は入力していない。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: 16:9 side-scrolling RPG background for the game “余白の森”, the innermost chamber of the root dungeon
Input images: Image 1 is the direct style, palette, pixel-scale, and cave-density reference for the preceding Echo Gallery; Image 2 is the outdoor guardian-tree form and painterly pixel texture reference
Primary request: Create the ancient Guardian Tree’s innermost root chamber, a quiet sacred boss arena reached immediately after Image 1.
Scene/backdrop: Inside a colossal old tree below the forest. Dark blue-green stone and interwoven roots form a broad vaulted chamber. In the upper-right-center, a restrained oval heart-knot of pale living wood and cool turquoise sap-light rests within layered roots; it should feel like breathing, not like a bright magical portal. Thin white roots flow outward from it and merge into the floor. Small violet and turquoise fungi give subtle jewel-like accents. The chamber is old, organic, solemn, and protective.
Style/medium: Richly colored hand-painted pixel-art illustration, simplified clustered shapes, visible pixel texture, storybook fantasy atmosphere, clearly illustrative rather than realistic, consistent with both references. Crisp readable silhouettes and restrained detail at game scale.
Composition/framing: Fixed straight-on side-view, 16:9. Continuous flat walkable ground line at about 60% of image height, clear from left edge to right edge. A generous dark readable staging area across the lower middle for a wide root guardian at roughly 63% of canvas width. Keep the far-right lower area around 80% width readable for an injured hunter overlay. Preserve a clear entry corridor at the far left. Use roots as a natural frame, not foreground obstacles. Strong depth in three layers but no perspective floor slope.
Lighting/mood: Cool turquoise reflected light, muted warm amber fungal specks, deep navy-green shadows; sacred, tense, compassionate, not horrific.
Color palette: Match Image 1’s blue-green cave, pale roots, turquoise and restrained violet accents; slightly richer but not neon.
Materials/textures: Gnarled pale bark, damp dark rock, fibrous roots, tiny fungi, painterly pixel clusters.
Constraints: Background only. No people, creatures, guardian, staff, weapon, bow, UI, lettering, symbols, treasure chest, doorway text, border, or watermark. Do not bake story-state objects into the background. Leave the lower character staging zones dark enough that pale sprites remain legible. Keep the heart-knot mostly above the actors, and avoid pale vertical roots immediately behind the guardian’s expected head and shoulders.
Avoid: photorealism, 3D rendering, glossy concept-art realism, anime characters, East Asian architecture, giant glowing portal, excessive bloom, muddy brown monochrome, dense white fibers across the central combat silhouette.
```

## 原本と派生

| ファイル | 寸法 | bytes | SHA-256 | 扱い |
|---|---:|---:|---|---|
| `root-heart-imagegen-a-v52.png` | 1672×941 | 2,583,275 | `9bac936d15e95f7d8b7fa9102428722a75d426459c391a3cfb694edc15ddfea9` | 組込みImageGen原本 |
| `root-heart-game-palette-v52-1x.png` | 480×270 | 267,177 | `9a9c53bae86c735ad6bec796d407f7e8eb8c00213761f7f058ade16efe6afe1e` | デザイン座標の確認用 |
| `root-heart-game-palette-v52.png` | 960×540 | 333,459 | `59c3d3757d30ca355adde6cc1423ecb39cd910458ea702b1b94659f05123b92f` | v53正式画像と同一内容 |

`tools/prepare-root-heart-v52.ts` が原本と正式森背景のハッシュを固定し、路面570をデザイン座標162へ合わせ、480×270へ縮小、森パレット138色へ最近傍写像した後、補間なしで960×540へ整数2倍する。人物の足元は176。

## 判定

- 太い根の大形状と暗い岩面により、微細な写実描写へ寄らず最深部の格が出ている。
- 左入口、中央の番人、右奥の負傷狩人の三領域を一枚で確保した。
- 心核は上段へ置き、番人の頭肩の背後を過度な白根で塞いでいない。
- 初稿Aを選定し、追加生成・編集は行わない。番人、折れた弓、伏せた枝先、狩人、白根の杖、呼吸光は動的層とする。
