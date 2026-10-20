# 共同倉背景の少数試作 v27

> 日付：2026-09-08  
> 状態：DEV合成確認済み／v28正式採用の選定元  
> 生成方式：Codex組込み画像生成（ImageGen）＋決定的なゲーム側変換

## 1. 目的

承認済み森入口の色鮮やかな質感を、共同倉の木、金具、補修布、朝の窓光へ展開する。貧しさを暗い廃墟ではなく、物が少なくても手入れの続く生活空間として見せる。

背景へ人物、配給札の文字、在庫、配給袋、樹脂瓶、会話窓を焼き込まない。十年前、現在、終幕、夜を同じ背景と動的コード層の組合せで表す。

## 2. 入力の役割

- スタイル参照：正式採用済み `src/assets/series2/backgrounds/forest_edge/middle.png`。青緑の距離感、古金、画素塊、材質密度だけを参照した。
- 構図・編集対象：`renderStorehouse` の実画面。左右の棚、中央の札板、右上の窓、梁、水平床だけを参照した。
- 入力・出力とも本作で制作した画像だけ。他作品の画像、人物写真、第三者のゲーム画面は使用していない。

## 3. 生成原本

| 原本 | 寸法 | 色数 | bytes | SHA-256 | 判定 |
|---|---:|---:|---:|---|---|
| `storehouse-imagegen-a-v27.png` | 1672×941 | 83,477 | 1,820,899 | `c520db49efdbbdd671be8ddf0e6ecab09d5ce13d0a9f6d064aa8c5ef68c0ed0b` | 構図と色は良いが細密、床が低い |
| `storehouse-imagegen-b-v27.png` | 1672×941 | 90,547 | 1,616,402 | `2cdf50d5ae9a75e349e283ce4113631c5dad62fbf58f130565a562977f5e00b1` | 画素塊を強めたが、色数と床位置は未合格 |
| `storehouse-imagegen-c-v27.png` | 1672×941 | 93,407 | 1,671,001 | `ed7e30ac5743df5370b3abd586c14882d68cc604087c9196a476c21b768a9de1` | 構造を整理。ゲーム側変換の採用元 |

三枚とも原本のまま保存し、本番Manifestへ登録しない。生成サービスの表示解像度と色数はゲーム規格ではないため、見た目だけで「ドット絵完成」と扱わない。

## 4. ゲーム縮尺への変換

`tools/prepare-storehouse-v27.ts` が生成Cと採用森背景のハッシュを確認してから、次の変換を行う。

1. 生成Cの上部0〜493行を、480×270設計の壁0〜141行へ写す。
2. 生成Cの不要な下壁帯494〜589行を除外する。
3. 床590〜940行を設計の142〜269行へ写し、既存の壁境界142と足元176を維持する。
4. 全画素を採用森背景の138色から最も近い色へ写像する。実際に使用した色は86色。
5. 480×270をnearestで整数2倍し、960×540の比較候補を作る。

| 派生 | 寸法 | 色数 | bytes | SHA-256 |
|---|---:|---:|---:|---|
| `storehouse-game-palette-v27-1x.png` | 480×270 | 86 | 109,800 | `6f9cfa3b64b4a0da652052606bb955d127887b13de6fc0a4c598c0118e003549` |
| `storehouse-game-palette-v27.png` | 960×540 | 86 | 135,893 | `47a127bb62e17edef260b53c775d23eae4b54dad10c21487d72b979983a7d7c4` |

二枚とも全画素不透明。後者の2×2画素は必ず同色で、非整数縮小や平滑化を本番規格に持ち込まない。

## 5. DEV合成

開発メニューへ「背景　共同倉v27」を追加した。

- `G`：コード基準／v27候補
- `U`：十年前／現在／終幕
- `N`：昼／夜
- `C`：背景のみ／人物・在庫・札・会話窓の合成

正式な茶髪主人公とセナ、子供時代のコード人物、札の消失、棚の在庫差、終幕の配給袋と樹脂瓶、会話窓を重ねた。四状態とも人物の頭身と足元、札の文字、棚の空き、本文が読める。夜はコードの色幕だけで同じ背景を使用できる。

このv27比較時点では通常進行の `renderStorehouse` を変更していなかった。その後の正式採用、動的層の共通化、通常導線の実画面検証は `storehouse-background-adoption-v28.md` を正とする。比較Sceneは引き続きユーザーの保存を変更せず、本番bundleにも資料PNGや資料パスを含めない。

## 6. 実送信プロンプト

### A：構図と材質

```text
Use case: precise-object-edit
Asset type: fixed-screen side-view RPG environment background trial
Input images: Image 1 is the approved forest background and must be used only as the visual-style, pixel-cluster, palette-depth, and material-quality reference. Image 2 is the current storehouse screen and is the edit target for spatial layout only.
Primary request: Redraw the storehouse environment from Image 2 as polished original pixel art with the rich, colorful tactile quality of Image 1, while preserving the storehouse's exact side-view room structure.
Scene/backdrop: a poor but carefully maintained communal village storehouse in daylight, ten years after a distant disaster; aged timber walls and floor, sturdy beams, an empty central notice board, shelving bays at left and right, and a small divided window at upper right.
Style/medium: crisp hand-placed pixel art, restrained 32-bit-era-inspired material detail, readable clustered pixels, no smooth painting, no vector outlines, no 3D.
Composition/framing: wide 16:9 fixed side view. Preserve the horizontal floor and character walking band. Keep the central lower area quiet for two 32x48 characters. Preserve left shelf, central blank board, right shelf and right window as distinct landmarks. Do not create stairs, platforms, perspective corridors, or a top-down view.
Lighting/mood: soft morning light through the upper-right window, subtle turquoise ambient shadow, warm muted gold on worn wood edges; cared-for and humane despite scarcity, never bleak horror.
Color palette: deep blue-green shadows, moss green and weathered umber timber, warm ochre/gold highlights, tiny restrained burgundy and muted violet accents only in fixed cloth repairs.
Materials/textures: visible but controlled wood grain, repaired joints, iron brackets, woven storage trim, dust-softened floorboards; match Image 1's depth separation and pixel density.
Constraints: environment background only. Remove every character, dialogue box, HUD, debug panel, button, name, label, readable writing, sack, bottle, food, herb bundle, loose inventory item, footprint, particle, glow, and foreground overlay from Image 2. The central notice board must be completely blank and readable labels must not appear anywhere. Shelves must be structurally present but empty enough for code-drawn changing supplies to be added later. Keep important detail above the lower dialogue area. No text, letters, symbols, logos, watermark, or border. Do not copy any specific existing game's scene or design.
Avoid: photorealism, painterly brushwork, anti-aliased edges, smooth gradients, excessively dark monochrome wood, luxurious abundance, baked characters or story-state props.
```

### B：画素密度

```text
Use case: precise-object-edit
Asset type: fixed-screen side-view RPG environment background trial, second pass
Input images: Image 1 is the edit target, the newly created communal storehouse. Image 2 is the approved forest background and is only the authoritative reference for true pixel cluster size, edge hardness, limited color count, and visual density.
Primary request: Change only Image 1's pixel-art density and the wall-to-floor seam. Preserve its storehouse architecture, object positions, camera, palette relationships, blank board, empty shelves, upper-right window, beams, brackets, and repaired cloth patches.
Composition/framing: keep the exact wide 16:9 straight-on composition. Raise the wall-to-floor seam so the walkable floor begins at about 65 percent of the image height, matching a game foot line at y=176 on a 270-pixel design grid. Keep the central character band calm and unobstructed.
Style/medium: unmistakable low-resolution game pixel art. Rebuild fine painterly texture into larger deliberate rectangular pixel clusters like Image 2. Hard nearest-neighbor-looking edges, flat clustered shading, no antialiasing, no subpixel noise, no canvas-grain overlay, no photographic texture, no smooth gradient. Visually limit the palette to roughly 48 colors while retaining turquoise shadows and warm aged-gold wood edges.
Constraints: change only density and floor height. Add no characters, inventory, food, sacks, bottles, herbs, labels, writing, UI, symbols, glow, particles, logos, watermark, or border. Keep every shelf empty and the central board completely blank. Do not crop or redesign the room.
```

### C：縦構図

```text
Use case: precise-object-edit
Asset type: fixed-screen side-view RPG storehouse background, composition correction
Input images: Image 1 is the edit target.
Primary request: Change only the vertical layout of Image 1 so it fits the existing 480x270 gameplay composition.
Composition correction: place the horizontal wall-to-floor boundary at exactly 53 percent of the image height. Move and slightly compress the left shelf, central blank notice board, right shelf, lower wall panels, brackets, and cloth repairs upward as a coherent group so the bottoms of the shelves and lower wall end just above that boundary. The floor must occupy the bottom 47 percent of the image. A 32x48 character will stand with feet at 65 percent of the image height, so keep that entire central walking band clear.
Invariants: preserve the exact straight-on 16:9 room, left and right shelf widths, centered blank board, upper-right window, teal-and-aged-gold palette, hard clustered pixel-art treatment, wood and metal materials, and morning lighting. Keep shelves empty and the board completely blank.
Constraints: add nothing. No people, sacks, bottles, food, herbs, inventory, text, letters, labels, symbols, UI, particles, glow, logos, watermark, or border. No camera change, perspective corridor, platform, stairs, crop, or redesign.
```

Bの「床65%」は足元176の比率と混同した指示で、床境界の正値は142/270≒53%。Cでも生成側は厳密値に達しなかったため、最終的に第4節の決定的変換で直した。この誤差も再利用時の注意として残す。

## 7. 採用結果

- 承認済み森背景と同じ青緑・古金へ統一でき、木材、金具、補修布、窓光に生活の手触りがある。人物と本文の可読域も確保できた。
- `storehouse-game-palette-v27.png` と同一バイト列を `src/assets/series2/backgrounds/village_storehouse/middle.png` へ正式配置した。
- 人物、文字、在庫、配給袋、樹脂瓶、夜の色は焼き込まず、通常Sceneの動的層として維持した。画像が読めない場合はコード背景へ戻る。
- 正式Manifest、通常導線、実画面、bundleの結果は `docs/concepts/storehouse-background-adoption-v28.md` を正とする。
