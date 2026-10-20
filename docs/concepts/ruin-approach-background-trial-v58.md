# 遺跡前の背景試作 v58

> 実施日：2026-09-24  
> 生成方式：Codex組込みImageGen  
> 判定：初稿Aを選定。v59の正式背景へ派生

## 目的

第三章の `ruin_approach` を、森から王国遺跡へ色と造形が切り替わる最初の画面として成立させる。ユーザーの「少し地味なので、プレイ中に美しいと思える工夫が必要」という方向確認を受け、濃藍の暗部を残したまま群青・青緑・菫・古金の中間色を豊かにする。名喰い蛭x180、通行止め206〜234、校訂印x360、足元176の実配置を守り、敵と物語上の印は背景へ焼き込まない。

## 入力画像

- Image 1：`src/assets/series2/backgrounds/knot_tree/middle.png`。直前の隣接画面、森の連続、ピクセル尺度、絵画的な色面の参照。
- Image 2：`src/assets/series2/backgrounds/village_gate/middle.png`。本世界の古い西・中欧風の石と木の材質言語だけを参照。昼の色と門の配置は参照しない。
- いずれも本作内の正式素材。第三者画像は入力していない。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: 16:9 side-scrolling RPG background for the game “余白の森”, the forest-to-ruin transition screen at the start of Chapter 3
Input images: Image 1 is the direct neighboring-screen reference for pixel scale, painterly clustering, forest continuity, and the path entering from the left; Image 2 is only a reference for the established old-European stone-and-wood material language of this world, not for its daylight palette or exact gate layout
Primary request: Create a beautiful, jewel-toned approach to a forgotten royal revision ruin, where the organic curves of Image 1 give way to disciplined straight stonework. This screen establishes a richer, more colorful visual standard for the ruin region.
Scene/backdrop: The far left retains a small amount of Image 1’s indigo-canopy forest, mossy roots, and blue-green foliage. Across the middle, ancient squared stone retaining walls and broken paving emerge from the forest. At the right around 72–78% of the canvas stands a weathered old-European stone entrance: a tall restrained rectangular arch with shallow buttresses, worn steps, and an open dark passage leading into an unseen courtyard. It belongs to an old kingdom, practical and severe rather than grand or classical. Plants and roots partly reclaim the lower masonry but do not obscure its straight construction.
Style/medium: Rich hand-painted pixel-art illustration with simplified clustered shapes, clear silhouettes, storybook fantasy atmosphere, strongly illustrative rather than realistic. Match the reference pixel texture while making the scene visibly more colorful and beautiful than the preceding forest.
Composition/framing: Fixed straight-on side-view, 16:9. Continuous flat walkable ground line at about 60% of image height and readable edge to edge; broken paving and steps remain visually behind or below the playable band and never force a perspective slope. Keep a readable mid-light staging pocket around 37% width for a segmented violet creature roughly 58×52 game pixels. Preserve open entry space at far left. Reserve a clean stone surface near x=360 in 480-wide design coordinates for a precise royal revision mark that the game will overlay later. The arch should be on the right, with a clear passage beyond it. Three depth layers; large readable shapes; foreground framing only at the extreme corners.
Lighting/mood: Saturated cool light filters from the unseen ruin: luminous teal and clear cobalt across stone edges, deep indigo shadows, restrained violet memory reflections, and warm old-gold glints on worn metal or stone trim. Mysterious, inviting, beautiful, ancient, and watchful—not bleak, gray, muddy, or horrific.
Color palette: Preserve true dark indigo for depth, but lift the midtones into rich cobalt, turquoise, and blue-green. Use violet in eroded gaps and old gold as a focused warm counterpoint. The image should feel jewel-toned and vivid without neon or rainbow clutter. Avoid an overall olive-brown cast.
Materials/textures: Broad painterly pixel clusters for blue-gray stone, oxidized teal mineral staining, moss, roots, damp earth, and sparse gold-warm trim; avoid noisy realistic microtexture.
Constraints: Background only. No people, creatures, leeches, statues, masks, weapons, lettering, dates, royal marks, emblems, seals, runes, readable symbols, signs, UI, border, or watermark. No story clue may be baked into the background. Leave the x=360 stone surface blank enough for a code-drawn mark.
Avoid: photorealism, 3D rendering, glossy realism, anime characters, East Asian architecture, torii or pagoda shapes, Roman temple columns, monumental palace grandeur, monochrome gray ruin, muddy desaturation, black horror entrance, neon magic portal, excessive bloom, bright detail behind the expected creature, foreground rubble covering the walkable path.
```

## 原本と派生

| ファイル | 寸法 | bytes | SHA-256 | 扱い |
|---|---:|---:|---|---|
| `ruin-approach-imagegen-a-v58.png` | 1672×941 | 2,758,397 | `4b9bb1366bdf058ac5e27fe9f68c0556a02326258c81ab9a5d516819c391b884` | 組込みImageGen原本 |
| `ruin-approach-game-palette-v58-1x.png` | 480×270 | 293,414 | `bb50e1d89faae8d731acac481a5017fc3a3a9a3ef670c2e12d100277c679df87` | デザイン座標の確認用 |
| `ruin-approach-game-palette-v58.png` | 960×540 | 359,718 | `43bbcefac8399e502765828eb0015b134e30505b7ec894af58b015871e130c35` | v59正式画像と同一内容 |

`tools/prepare-ruin-approach-v58.ts` が原本のハッシュと寸法を固定し、原本の路面584をデザイン座標162へ合わせて480×270へ縮小する。森パレットへは写像せず、ゲーム実寸の画素から重み付き中央値分割で遺跡地域用192色を作る。各バケット平均に近い実在画素を代表色にすることで、群青・青緑・菫・古金の彩度を平均化で失わない。最後に補間なしで960×540へ整数2倍する。人物の足元は176。

## 判定

- 左端に結び木側の藍色の森を残しながら、中央から直線的な石積み、右に王国遺跡の入口が明確に現れる。
- 一律な彩度上げではなく、濃藍の影、青緑の石、菫の草花、古金の縁で画面に色の距離が生まれた。
- 名喰い蛭x180の背後は中明度だが過剰に明るくなく、紫の分節シルエットを読める。歩行帯は平坦で、入口の階段は移動面を塞がない。
- 初稿Aを選定し、追加生成・編集は行わない。名喰い蛭、王国の校訂印、十年前の刻み、人物、粒子、会話、UIは動的層とする。

