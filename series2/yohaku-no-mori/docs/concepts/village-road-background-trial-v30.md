# 村道背景の少数試作 v29→v30

> 日付：2026-09-10  
> 状態：欧州農村屋根へ修正／DEV合成確認済み／v31正式採用の選定元  
> 生成方式：Codex組込みImageGen

## 1. 目的と判断

第一章で長く使う村道を、正式な森入口と共同倉の色・材質へ接続する。固定背景には左右の家、共同井戸、畑、遠景、水平な土道だけを置き、行商人、荷車、記録紙、人物は物語状態としてコード層へ残す。

初稿Aは窓、井戸、色、道の質感はよかった一方、低い勾配、厚い瓦列、横へ張り出す軒が東アジア建築を連想させた。v30では非屋根部分を不変条件にし、屋根だけを王国時代の西・中欧農村にある急勾配の切妻、木板と古いスレートの補修葺き、実用的な石煙突へ変更した。

## 2. 生成物

| ファイル | 寸法 | bytes | SHA-256 | 用途 |
|---|---:|---:|---|---|
| `village-road-imagegen-a-v29.png` | 1672×941 | 1,713,086 | `77cdca35cfeb2b2e0073541be97a5e5c3c1c49d274626c8d9a71b8429018e875` | 初稿。屋根以外の構図基準 |
| `village-road-imagegen-europe-v30.png` | 1672×941 | 1,760,465 | `1aa8fd9bb0d547b033fb724638e813fac415e572aa2b5419771029bb47ea5e2f` | 屋根修正版の原本 |
| `village-road-game-palette-v30-1x.png` | 480×270 | 132,826 | `ae9d1cb8de1cbc6ede21cb934b8e876869d81b66f399e3a1de0598981c7d3d95` | ゲーム設計寸法 |
| `village-road-game-palette-v30.png` | 960×540 | 159,457 | `ac363c7fd3abe775a59997b9e0f294d36eb6a27a2982a08dfe4caf43155b7515` | nearest整数2倍の比較候補 |

## 3. ゲーム寸法への変換

`tools/prepare-village-road-v30.ts` が原本と正式森背景のハッシュを検査し、次を決定的に行う。

- 1672×941から480×270へ補間なしで標本化する。
- 原本の土道上端590をゲーム座標162へ合わせる二領域の縦変換を行う。
- 人物の足元176を、水平で歩ける土道内に保つ。
- 正式森背景の138色だけへ、共同倉と同じ重み付きRGB距離で写像する。
- 480×270の各画素を厳密な2×2へ複製して960×540を作る。

縮小後も、急勾配の三角形、左右の石煙突、暗い垂木、青緑の窓ガラス、井戸の巻上げ機が識別できる。道の下32%は会話UIのため静かに保たれる。

検証：`npm run verify:village-road-trial`

## 4. 実送信プロンプト

### 初稿A（v29）

```text
Use case: stylized-concept
Asset type: fixed-screen side-view RPG village-road environment background trial
Input images: Image 1 is the adopted forest background and is the authoritative reference for crisp pixel clusters, edge hardness, outdoor palette depth, and ground readability. Image 2 is the adopted communal storehouse and is the authoritative reference for aged timber, patched plaster, iron fittings, restrained material detail, and warm lived-in care. Image 3 is the current village-road game screen and is the layout reference only; use the landscape game viewport inside it, remove all UI and the character.
Primary request: Create an original polished pixel-art village road for the same game world, preserving the simple spatial grammar of Image 3 while bringing it to the tactile, colorful finish of Images 1 and 2.
Scene/backdrop: a financially struggling but carefully maintained remote village ten years after a distant disaster. Two modest plaster-and-timber cottages stand apart, one at the left and one at the right. A sturdy communal stone well with a wooden winding frame sits left of center. Low green hills and small cultivated fields recede behind the houses. A broad level packed-earth road crosses the entire foreground.
Style/medium: unmistakable hand-placed game pixel art, large deliberate rectangular pixel clusters, hard nearest-neighbor-looking edges, restrained late-16-bit/32-bit-era material depth, no smooth painting, no vector lines, no 3D.
Composition/framing: exact straight-on 16:9 fixed side view. Preserve the spatial landmarks from Image 3: left cottage, well left of center, wide quiet central gap, right cottage. The packed-earth road begins at about 60 percent of image height. A 32x48 character will stand with feet at 65 percent of image height, so keep the full horizontal walking band from about 55 to 69 percent clear and level. Keep the bottom 32 percent visually calm because dialogue UI will cover it. No stairs, ledges, perspective corridor, top-down view, or deep road vanishing point.
Lighting/mood: clear gentle morning light from upper right, turquoise ambient distance, warm aged-gold highlights on repaired wood, humane and quietly resilient, colorful without looking prosperous or festive.
Color palette: pale turquoise sky and atmospheric hills, moss and olive fields, deep blue-green roof and timber shadows, weathered umber, ochre and muted gold edges, tiny restrained coral and plum repair-cloth accents.
Materials/textures: lime plaster with repaired patches, dark weathered roof shingles, worn beams, stone well blocks, packed earth with broad readable clusters, small fixed empty planter troughs. Match the two adopted references' density and color relationships.
Constraints: environment background only. No people, character, merchant, wagon, cart, cargo, sacks, bottles, record paper, loose tools, hunter equipment, animals, footprints, moving particles, foreground effects, dialogue box, HUD, debug panel, border, letters, readable signs, symbols, logos, or watermark. Do not bake story-progress objects into the background. Keep doors and windows closed or empty, with no silhouettes. The village must look maintained despite scarcity, not abandoned, ruined, medieval-luxurious, or storybook-cute. Do not copy any specific existing game's scene or design.
Avoid: photorealism, painterly brushwork, antialiasing, smooth gradients, excessive micro-noise, giant decorative trees blocking the houses, dense market clutter, saturated carnival colors, dramatic cinematic perspective.
```

### 屋根だけの修正（v30）

```text
Use case: precise-object-edit
Asset type: fixed-screen side-view RPG village-road environment background trial
Input images: Image 1 is the edit target.
Primary request: Replace only the two cottage roofs and the small upper wall areas required by the new roof geometry. Make both cottages read unmistakably as modest pre-industrial rural European buildings in a kingdom-era fantasy world, not East Asian houses.
Roof design: each cottage has a steep 48–55 degree front-facing gable roof with a clear triangular silhouette, simple straight eaves, exposed dark oak rafter ends, and irregular weathered split-wood shingles mixed with a few old slate repairs. Add one small practical rough-stone chimney set slightly off center on each roof. Roof ridges are simple wood or stone-capped lines. Keep them poor, repaired, and functional rather than ornate.
Architectural cues: restrained late-medieval-to-early-modern Central or Western European countryside; limewashed plaster, dark oak posts, rough local stone, practical proportions. No cathedral, manor, castle, Tudor mansion, or prosperous merchant-house styling.
Invariants: preserve the exact straight-on 16:9 framing, cottage footprint and scale, doors, excellent blue-green glass windows, planters, stone well and wooden winch, fence, hills, fields, trees, sky, clouds, packed-earth road, lighting direction, palette, hard pixel clusters, and every non-roof element from Image 1. Keep the clear character walking band and quiet lower area unchanged.
Constraints: edit only the roofs and unavoidable triangular upper facade beneath them. Add no people, characters, animals, wagon, cargo, text, signs, symbols, UI, watermark, or extra buildings. No Asian roof cues: no low broad tiled hip roof, no ceramic tile rows, no upturned or strongly projecting eaves, no pagoda-like ridge, no decorative end caps. No modern roof, no red Mediterranean tile, no thick thatched roof, no snow. Preserve crisp hand-placed pixel art with no antialiasing or painterly smoothing.
```

## 5. DEV合成確認

DEV「背景　4地域比較」の村を拡大すると、初期表示をv30候補にした。通常進行やユーザーの保存は変更しない。

- `G`：コード基準／v30候補
- `U`：到着前／行商人到着／日付判明
- `C`：静景／合成
- `TAB`：4地域一覧

2026-09-10に原寸ブラウザで三状態を確認した。正式な成人主人公は足元176へ接地し、会話UIは下部の静かな土道へ収まる。急勾配の切妻と石煙突は縮小後も識別でき、荷車と記録紙は右の扉、窓、中央の井戸を隠さない。候補側も本編から分離した `drawVillageRoadStoryState` を使うため、物語小物の座標を二重管理しない。

## 6. v31での採用

ユーザーの方向承認後、960×540候補と同一バイト列を `src/assets/series2/backgrounds/village_road/middle.png` へ正式配置した。導入、第一章、夕暮れの単一EDへ同じ固定景観を注入し、行商人、荷車、記録紙、人物、時間帯の色幕は動的層に残した。正式接続と検証は `village-road-background-adoption-v31.md` を正とする。
