# 深い森の背景試作 v54

> 実施日：2026-09-24  
> 生成方式：Codex組込みImageGen  
> 判定：初稿Aを選定。v55の正式背景へ派生

## 目的

第三章の開始地点 `deep_forest` を、苔背の狼x160、白枝鹿x330、仮面の守人x405、足元176の実配置で成立させる。守護樹心部から地上の古い森へ連続させつつ、狼、鹿、守人、外向きに導く白根を背景へ焼き込まず、二段階の通行止めと攻略後を一枚の静景で共有する。

## 入力画像

- Image 1：`src/assets/series2/backgrounds/root_heart/middle.png`。直前の隣接景観、青緑と藍、白根、ピクセル尺度の参照。
- Image 2：`src/assets/series2/backgrounds/guardian_hollow/middle.png`。地上の守護樹、森の自然光、大形状、絵画的なピクセル質感の参照。
- いずれも本作内の正式素材。第三者画像は入力していない。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: 16:9 side-scrolling RPG background for the game “余白の森”, the first outdoor screen of Chapter 3
Input images: Image 1 is the direct color, pixel-scale, and root-material reference for the Guardian Tree heart chamber immediately to the left; Image 2 is the outdoor Guardian Tree, forest lighting, large-shape, and painterly pixel-texture reference
Primary request: Create the deep forest immediately beyond the Guardian Tree, where the canopy closes and the path toward an ancient ruin begins.
Scene/backdrop: A richly colored old European-fantasy forest under a nearly closed canopy. At the far left, a low shadowed root opening and pale inner roots subtly imply the exit from Image 1 without showing an architectural doorway. The center and right become an ancient woodland path enclosed by large twisting trunks, moss-covered roots, blue-green undergrowth, small turquoise fungi, and only a few restrained violet memory-colored growths. White living roots cross and border the trail in low horizontal arcs, guiding intruders back outward rather than forming a magical wall. The right edge narrows toward the next grove and an unseen ancient marked tree.
Style/medium: Hand-painted pixel-art illustration with simplified clustered shapes, visible pixel texture, storybook fantasy atmosphere, vivid color relationships, and clearly illustrative rather than realistic detail. Match both references and keep forms readable at 480×270 game scale.
Composition/framing: Fixed straight-on side-view, 16:9. Continuous flat walkable ground line at about 60% of image height and readable from edge to edge. Preserve three dark sprite staging pockets: around 33% width for a low moss wolf, around 69% width for a tall pale-antler deer, and around 84% width for a masked human guardian. Keep pale roots away from the deer antlers and guardian head; place the most recognizable white-root arc low across the floor between staging pockets. Clear entry space at far left. Use large trunks as vertical rhythm and canopy framing, not as foreground obstructions. Three layers of depth, no sloped perspective floor.
Lighting/mood: Deep indigo upper canopy, blue-green mid forest, moss green at the ground, muted old-gold shafts and tiny turquoise reflections; watchful, protective, mysterious, not sinister.
Color palette: Continue Image 1’s navy and turquoise into Image 2’s green forest; slightly more colorful than the cave but darker than the earlier forest, with violet only in small root gaps and fungi.
Materials/textures: Broad painterly pixel clusters for bark, moss, roots, leaves, damp soil, and fungi; avoid noisy realistic microtexture.
Constraints: Background only. No people, guardian, animals, antlers, masks, weapons, signs, runes, writing, ropes, knots, ruins, buildings, UI, lettering, border, or watermark. Do not bake combat or story-state objects into the background. Keep the entire lower character band readable and relatively uncluttered.
Avoid: photorealism, 3D rendering, glossy concept-art realism, anime characters, East Asian architecture, horror forest, black monochrome, neon magic, giant portal, excessive bloom, dense white roots behind expected sprites, heavy foreground leaves covering the walkable path.
```

## 原本と派生

| ファイル | 寸法 | bytes | SHA-256 | 扱い |
|---|---:|---:|---|---|
| `deep-forest-imagegen-a-v54.png` | 1672×941 | 2,522,916 | `0af122e6e1a7c5008d4fb1e5279cb7be6d3e4575c70dd01aa642a40118b0bba6` | 組込みImageGen原本 |
| `deep-forest-game-palette-v54-1x.png` | 480×270 | 261,719 | `a93e811e0abddf6f81e27659326e4998202473ed53e4eade34a0d32b005bd9e5` | デザイン座標の確認用 |
| `deep-forest-game-palette-v54.png` | 960×540 | 319,370 | `2bddae0c96323eba9a6385782dfa5de5f69089bd6d9ee9de18454ddb37eded53` | v55正式画像と同一内容 |

`tools/prepare-deep-forest-v54.ts` が原本と正式森背景のハッシュを固定し、原本の路面570をデザイン座標162へ合わせ、480×270へ縮小、正式森パレット138色へ最近傍写像した後、補間なしで960×540へ整数2倍する。人物の足元は176。

## 判定

- 左の低い根の出口が守護樹心部との連続性を作り、右へ行くほど天蓋が閉じる。
- 狼、鹿、守人の三つの配置領域を暗く保ち、白根を鹿の枝角や守人の頭へ重ねていない。
- 青緑、苔色、古い金色の光が洞窟より豊かで、写実的な微細描写や過剰な発光には寄っていない。
- 初稿Aを選定し、追加生成・編集は行わない。狼、鹿、守人、人物、白根の誘導光、粒子、会話、UIは動的層とする。

