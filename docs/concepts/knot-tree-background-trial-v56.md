# 結び木の背景試作 v56

> 実施日：2026-09-24  
> 生成方式：Codex組込みImageGen  
> 判定：初稿Aを選定。v57の正式背景へ派生

## 目的

第三章の二画面目 `knot_tree` を、白枝鹿x180、通行止め206〜234、古木の調査点x350、足元176の実配置で成立させる。直前の深い森から色と歩行帯を連続させ、「一本だけ明らかに古い木」を画面の焦点とする。左下がりの刻みと二重結びは正確な物語小物としてコード層へ残し、背景へ焼き込まない。

## 入力画像

- Image 1：`src/assets/series2/backgrounds/deep_forest/middle.png`。直前の隣接景観、閉じた天蓋、歩行帯、色、ピクセル尺度の参照。
- Image 2：`src/assets/series2/backgrounds/guardian_hollow/middle.png`。一本の古木の尺度、大形状、絵画的なピクセル質感の参照。
- いずれも本作内の正式素材。第三者画像は入力していない。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: 16:9 side-scrolling RPG background for the game “余白の森”, the second outdoor screen of Chapter 3, called the Knot Tree
Input images: Image 1 is the direct neighboring-screen reference for palette, canopy darkness, walkable ground, pixel scale, and painterly density; Image 2 is the reference for the grandeur and readable large shapes of a single ancient tree
Primary request: Create the ancient forest clearing immediately to the right of Image 1, centered on a distinctive old marker tree whose bark will later receive exact story markings as a separate game layer.
Scene/backdrop: A richly colored old European-fantasy forest beneath a closed indigo canopy. The left edge continues naturally from Image 1 with mossy roots and blue-green undergrowth. Around 70–76% of the canvas width stands one immense ancient tree with a broad unbroken trunk and intertwined buttress roots, older and more solemn than the surrounding trees but not hollow and not magical. Its lower-middle bark must include a clean, readable, moderately dark vertical surface where the game will overlay small diagonal carvings and a cord later. The path continues past the tree toward the far-right forest and the unseen ruin.
Style/medium: Hand-painted pixel-art illustration with simplified clustered shapes, visible pixel texture, storybook fantasy atmosphere, vivid color relationships, clearly illustrative rather than realistic. Closely match both reference images and remain readable at 480×270 game scale.
Composition/framing: Fixed straight-on side-view, 16:9. Continuous flat walkable ground line at about 60% of image height, readable edge to edge. Keep a generous dark sprite staging pocket around 37% width for a tall pale-antler deer; do not put pale branches, roots, bright fungi, or vertical light directly behind its expected head and antlers. Preserve clear player entry at far left. Place the ancient marker tree around x=350 in 480-wide design coordinates, with its useful bark area roughly y=55–145. Keep the bark surface at x=335–365 simple enough for small code-drawn marks to read. Use large trunks and roots as framing and depth, never as foreground obstacles across the walking band. Three layers of depth, no sloped perspective floor.
Lighting/mood: Deep indigo canopy, blue-green distant forest, moss green and subdued old-gold light near the ground, restrained turquoise fungi and tiny violet memory-colored accents; watchful, intimate, old, protective, not sinister.
Color palette: Continue Image 1 without a visible palette break. Slightly concentrate muted old-gold near the marker tree while keeping the deer staging pocket cool and dark.
Materials/textures: Broad painterly pixel clusters for bark, moss, roots, leaves, damp soil, and sparse fungi; avoid noisy realistic microtexture.
Constraints: Background only. No people, animals, deer, antlers, masks, weapons, rope, cord, knots, loops, carvings, slash marks, runes, writing, symbols, signs, royal emblems, ruins, buildings, doors, hollow openings, UI, lettering, border, or watermark. Do not bake any encounter, clue, or story-state object into the background. Keep the entire lower character band readable and relatively uncluttered.
Avoid: photorealism, 3D rendering, glossy concept-art realism, anime characters, East Asian architecture, horror forest, black monochrome, neon magic, giant portal, face-like tree, tree doorway, excessive bloom, dense pale roots behind the expected deer, foreground leaves covering the walkable path.
```

## 原本と派生

| ファイル | 寸法 | bytes | SHA-256 | 扱い |
|---|---:|---:|---|---|
| `knot-tree-imagegen-a-v56.png` | 1672×941 | 2,625,045 | `1008169e013b5d342cba086c5465b046d08743558980e8ed1841c3503d0ceb0e` | 組込みImageGen原本 |
| `knot-tree-game-palette-v56-1x.png` | 480×270 | 269,812 | `a69f914b5032a65211d753662b1fdb30c58b600cf070353ced243cb4bd149d0e` | デザイン座標の確認用 |
| `knot-tree-game-palette-v56.png` | 960×540 | 328,436 | `80fe665348fb07d7c8c3d55d71e1d918f6fe41024eb93a0662ad54ecbcdaf3ce` | v57正式画像と同一内容 |

`tools/prepare-knot-tree-v56.ts` が原本と正式森背景のハッシュを固定し、原本の路面580をデザイン座標162へ合わせ、480×270へ縮小、正式森パレット138色へ最近傍写像した後、補間なしで960×540へ整数2倍する。使用色は137色、人物の足元は176。

## 判定

- 一本の古木が、入口の守護樹とは異なる「森の中の目印」として読める。
- 白枝鹿x180の頭と枝角の背後を暗く保ち、歩行帯を根や前景で塞いでいない。
- 古木の樹皮面へコードの刻みと二重結びを重ねられ、右端には遺跡へ続く道が残る。
- 初稿Aを選定し、追加生成・編集は行わない。鹿、刻み、紐、二重結び、人物、粒子、会話、UIは動的層とする。

