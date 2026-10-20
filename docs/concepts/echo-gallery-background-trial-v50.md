# 反響回廊 背景試作 v50

> 日付：2026-09-18  
> 状態：内蔵ImageGen生成・中央繊維の一点編集・森パレット変換・実Scene二状態比較済み／v51として正式採用  
> 生成方式：Codex組込みImageGen

## 景観と物語上の役割

第二章の `echo_gallery`。根洞窟入口より一段深く、白い根の繊維が間を空けて並ぶことで、音が往復する自然の回廊を表す。人工の柱、文字、魔法装置は置かず、太い根のアーチ、丸い青緑の岩、左右の白い繊維の反復で場所を識別する。

路面上端は162、人物足元は176。x252の白枝鹿、角に掛けた狩人の外套、攻略後に置かれた外套、人物、反響光、会話、UIは静景へ焼き込まず動的層で描く。初稿Aは鹿の枝角位置と中央の白い繊維が重なったため、Bでは画面幅44〜66%の繊維だけを暗い岩面へ置換した。左右の繊維、根、路面、出入口は維持する。

## 保存物

| ファイル | 寸法 | bytes | SHA-256 | 扱い |
|---|---:|---:|---|---|
| `echo-gallery-imagegen-a-v50.png` | 1672×941 | 2,411,045 | `b4540db412a5e4c1165ebbf4055808b39c431f54339f797303ed54e9d7dd48db` | 初稿。中央繊維が鹿と重なるため不採用 |
| `echo-gallery-imagegen-b-v50.png` | 1672×941 | 2,269,871 | `826fdb5c270b38db9d6c1c2e16c94d57437f3a59505a08033e103ae4d52c01d1` | 中央だけを暗い岩へ編集した選定原本 |
| `echo-gallery-game-palette-v50-1x.png` | 480×270 | 237,109 | `210afb023351b3660a2beb59de989ec3d127f3fc356c19bebe9b8afd8ac118b1` | 選定派生 |
| `echo-gallery-game-palette-v50.png` | 960×540 | 295,034 | `a7a0b8d4281b856b6cccbb1cbc76c71c2f81a5ba048bdff3fa94bf66b605aa43` | v51正式画像と同一 |

## 変換と比較

`tools/prepare-echo-gallery-v50.ts` は選定原本Bと正式森入口のハッシュ・寸法を確認し、原本の路面基準570をゲーム座標162へ対応させる。正式森背景の138色へ重み付きRGB距離で写像し、137色を使用。480×270から補間なしで整数2倍にする。`npm run verify:echo-gallery-trial` でv51正式画像とのバイト一致まで確認できる。

DEV「背景　4地域比較」のOキーで、保存を変えない実SideViewScene比較へ入る。Gで画像／コード、Uで「白枝鹿と外套」「最深部へ開通」、Cで静景、Hで比較表示を切り替える。正式画像、鹿、角の外套、攻略後の外套、右の出口は実Sceneで確認する。

## 初稿Aの実送信プロンプト

```text
Use case: stylized-concept
Asset type: original production background for a side-view Japanese fantasy RPG, scene "余白の森 / 反響回廊" (Echo Gallery).

Input images:
- Image 1: the immediately adjacent Root Hollow Entrance. Use it for underground root-and-rock continuity, palette, road height, and pixel scale only. The new room must feel deeper and must not repeat its daylight opening or exact root composition.
- Image 2: the project's approved illustration-density reference. Use only its broad readable shapes, clear contours, restrained clustered shading, and low visual noise. Do not copy its outdoor scenery.

Primary request:
Create a deeper natural gallery beneath an ancient guardian tree: a long root cavern where pale root fibers descend in calm, repeated intervals like loose harp strings, making the chamber feel acoustically resonant. Rounded blue-green rock walls and enormous dark roots form a wide tunnel. The space is organic, never built by people. A soft cool turquoise glow travels along a few pale fibers, with tiny restrained old-gold reflections in damp stone. The far-right corridor clearly continues toward the tree's heart.

Scene/backdrop:
No exterior daylight and no visible sky. The left edge should read as the passage back to Image 1; the right edge is the deeper exit. Use a repeating rhythm of pale ivory root strands across the rear wall, with larger dark root arches framing them. Keep the strands sparse and grouped rather than a dense curtain. They may hang in the upper/background area, but must stop above the walking strip. A shallow dark recess behind the central area can suggest echoing depth without becoming a doorway or ruin.

STRICT GAME COMPOSITION:
- Landscape 16:9, straight side-on camera, intended for 480x270 and nearest-neighbor display at 960x540.
- A single flat continuous walkable ground strip spans the full width. Its far/top edge must be near 60% image height (design y≈162/270), with character feet at y≈176/270.
- Preserve clean negative space around design x≈252 for a white-antlered deer enemy and the hero. Keep x≈210–316 low-detail and free of roots, stones, fibers, bright hotspots, or foreground objects that could merge with the deer.
- The encounter blocks progress near x≈286; the background itself must not visually block that point.
- Both left and right exits must remain visually readable, with the right path continuing into darker depth beyond x≈316.
- Keep the lower foreground only as a thin framing band. No roots, water, rocks, ledges, or vegetation may cross the walk strip.

Style/medium:
Colorful hand-crafted 16-bit-era storybook pixel-art illustration. Large deliberate pixel clusters, clean silhouettes, broad color fields, and only 2–4 tone cel-like shading per material. Rich but controlled, readable at game scale. It must match the established world without increasing realism or texture density.

Lighting/mood:
Quiet, resonant, protective, slightly solemn—not horror. Cool teal and muted cyan reflections, pale ivory fibers, moss-dark green-brown roots, restrained ochre/old-gold mineral accents. Deeper means darker shapes and less exterior light, not more photographic detail.

Constraints:
Scenery only. No characters, deer, animals, enemies, hunter, cloak, clothing, antlers, footprints, bones, weapons, practice target, vines, magical glyphs, readable runes, text, signs, UI, treasure, doors, columns, masonry, ruins, torches, buildings, or artificial architecture.

Avoid:
Photorealism, realistic concept art, glossy PBR rock, excessive grain, all-over micro-dithering, hyper-detailed bark, noisy stippling, cinematic depth of field, fog that hides the walk strip, symmetrical temple composition, and bright fantasy spectacle.

Output intent:
One production-minded game background candidate with a distinct white-fiber rhythm, clear gameplay space, and direct visual continuity from the Root Hollow Entrance.
```

## 選定原本Bの編集プロンプト

```text
Use case: precise-object-edit
Asset type: side-view RPG background correction for "余白の森 / 反響回廊".

Image 1 is the edit target. Change only the central rear-wall area needed for gameplay readability.

Primary edit:
Remove the pale/white hanging root-fiber cluster behind the central character-and-deer placement zone, approximately horizontal 44%–66% of the image width (design x≈210–316 of 480), especially the bright vertical strands around the deer-antler position near x≈270–295. Replace those removed strands naturally with the same dark rounded blue-green cavern rock wall and subdued moss-dark root surfaces already present nearby. The central area must become a calm dark silhouette field so a pale white-antlered deer will read clearly when added by game code.

Keep unchanged:
- the entire composition, camera, dimensions, road height, flat walk strip, left passage, right passage, large root arches, bottom foreground, color palette, lighting, pixel scale, and storybook pixel-art finish;
- the pale fiber groups outside the central gameplay zone, especially the left group and far-right group, so the room still reads as the Echo Gallery;
- all path edges and every object below the rear wall.

Constraints:
Scenery only. Do not add any deer, antlers, cloak, characters, creatures, text, glyphs, props, doors, ruins, or UI. Do not brighten the replacement patch. Match neighboring pixel clusters and 2–4 tone shading exactly. No smoothing, photorealism, new grain, or new micro-detail.

Output intent:
A minimally changed corrected background: central dark rock negative space behind the future deer; everything else visually invariant.
```

