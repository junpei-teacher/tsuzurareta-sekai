# 村門背景の少数試作 v32

> 日付：2026-09-11  
> 状態：生成BをDEV三状態で合成確認済み／v33で本番採用  
> 生成方式：Codex組込みImageGen

## 1. 目的と分担

正式村道の王国圏農村と、正式森入口の白樺・古木を一つの固定画面で接続する。鳥居、城門、豪邸の入口にせず、村人が地元の石と木で維持する小さな境界にする。

固定背景に含めるものは、左端の家の一部、畑、低い石垣と柵、独立した二本の門柱、右側の白樺と古木、水平な土道だけ。警告布、狩人装備、通行止めの横木、開門時に外した横木、人物、UIは物語状態としてコード層へ残す。

## 2. 生成と選定

初稿Aは、村道と森の接続、色、石、木、窓の質感は合格だった。ただし二本の門柱が太く、内側の通路がゲーム座標より約3倍広いため、既存の横木が届かない。

生成Bでは門柱だけを細く近づけた。ゲーム座標換算で左柱中心約240、右柱中心約281、内側の空き約27pxとなり、現行の横木x=239〜278と整合する。二本は上で接続せず、急勾配の小さなスレート笠だけを持つ。

| ファイル | 寸法 | bytes | SHA-256 | 用途 |
|---|---:|---:|---|---|
| `village-gate-imagegen-a-v32.png` | 1672×941 | 1,962,211 | `ac4e2bff92d47cd490c7021328a3fddcbe7d081926235cbd8a9f2aa2b4778c48` | 初稿。門柱が太く遠い |
| `village-gate-imagegen-b-v32.png` | 1672×941 | 1,871,223 | `61347474f7cf30b11c7fcd51864cd78c52af75a67e20b0865a8a9f42e4ce4db7` | 門柱修正版の選定原本 |
| `village-gate-game-palette-v32-1x.png` | 480×270 | 153,407 | `6f58e8d267f1f6b3703eeb52fc1a99e8162aed1c90d11386b77c16f881827e57` | ゲーム設計寸法 |
| `village-gate-game-palette-v32.png` | 960×540 | 184,074 | `faf750f7db48583045c2b3b95d9b18dd64a9293a5d8cbea5d3eb8141ead4270f` | nearest整数2倍の比較候補 |

## 3. ゲーム寸法への変換

`tools/prepare-village-gate-v32.ts` が生成Bと正式森背景のハッシュを検査してから、次を決定的に行う。

- 1672×941から480×270へ補間なしで標本化する。
- 原本の路面上端570をゲーム座標162へ合わせる二領域の縦変換を行う。
- 人物の足元176と門の通路を同じ水平面に置く。
- 正式森背景の138色だけへ、共同倉・村道と同じ重み付きRGB距離で写像する。
- 480×270の各画素を厳密な2×2へ複製して960×540を作る。

検証：`npm run verify:village-gate-trial`

## 4. DEV合成確認

DEV「背景　4地域比較」の村を拡大し、`V`で村道／村門を切り替える。比較はユーザーの保存を変更しない。

- `G`：コード基準／v32候補
- `V`：村道／村門
- `U`：初期／警告後／出発後
- `C`：静景／合成

物語小物を `drawVillageGateStoryState` へ分離し、コード背景と候補背景で同じ座標を使う。原寸ブラウザで次を確認した。

- 初期：横木が左右の門柱へ届き、中央を閉じる
- 警告後：小さな警告布が右柱だけに付き、森や通路を隠さない
- 出発後：横木は村側へ立て掛けられ、中央の通路が開く。狩人装備の空きも読める
- 正式主人公の足元176、左の家と窓、右の白樺と古木、下部の会話UIが競合しない

試作時検証はv33の正式接続検証へ統合した。現在は `npm run verify:village-gate-story` を使う。

## 5. 実送信プロンプト

### 初稿A

```text
Use case: stylized-concept
Asset type: fixed-screen side-view RPG village-gate environment background trial
Input images: Image 1 is the adopted European rural village road and is authoritative for kingdom-era architecture, warm lime plaster, repaired dark timber and slate, turquoise sky, distant hills, packed-earth road, crisp pixel clusters, and material density. Image 2 is the adopted forest entrance and is authoritative for white birch bark, ancient dark trees, turquoise atmospheric depth, hard pixel edges, forest shadow, and ground readability. Create a new scene that belongs spatially and visually between these two places; neither image is an edit target.
Primary request: Create an original polished pixel-art outer village gate where a poor but carefully maintained Western/Central European kingdom-era village ends and the mysterious forest begins.
Scene/backdrop: the left 45 percent is the village edge with a low rough dry-stone wall, simple repaired split-oak fence, a glimpse of cultivated field and the same distant hills as Image 1. The right 40 percent becomes the forest edge, beginning with pale birch trunks and ending in one broad old dark oak, using the depth and colors of Image 2. Near the center-right is a narrow village exit formed by two separate practical gate piers: rough local stone bases with dark oak inner posts, each independently capped by a small steep weathered slate cap. The two piers are not joined overhead. The opening between them is empty and clearly passable.
Style/medium: unmistakable hand-placed game pixel art, large deliberate rectangular pixel clusters, hard nearest-neighbor-looking edges, restrained late-16-bit/32-bit-era material depth, no smooth painting, no vector lines, no 3D. Match the two adopted images closely enough to feel like one continuous game world.
Composition/framing: exact straight-on 16:9 fixed side view. Place the clear gate opening from about 48 to 59 percent of image width, corresponding to game x=232–285. Keep the broad packed-earth walking surface level across the entire frame. The ground/road begins at about 60 percent of image height, corresponding to game y=162. A 32x48 character will stand with feet at 65 percent, game y=176, so keep the horizontal walking band from 55 to 70 percent clear and level, including the entire gate opening. Keep the bottom 32 percent visually calm because dialogue UI will cover it. No perspective corridor, top-down angle, stairs, ledges, or deep vanishing road.
Lighting/mood: clear gentle morning light from upper right, warm aged-gold edges on repaired village wood and stone, turquoise ambient distance, cooler deeper forest shadow on the right. Quiet vigilance at the edge of home, not danger or horror.
Color palette: turquoise sky and distance, moss and olive vegetation, pale birch, deep blue-green and near-black forest shadows, weathered umber and ochre wood, muted warm limestone, restrained old-gold highlights. Maintain the color relationships of Images 1 and 2.
Materials/textures: irregular local stone with repaired mortar, split-oak rails, small practical slate caps with steep European silhouettes, packed earth with broad readable clusters, moss and sparse grasses. Poor but maintained, never abandoned or grand.
Constraints: fixed environment background only. No people, characters, hunters, merchant, animals, monsters, weapons, arrows, quiver, leather bag, crate, warning cloth, banner, rope, knot, movable gate leaf, closed gate, horizontal barrier bars, cart, footprints, particle effects, UI, border, letters, words, readable sign, inscription, symbol, logo, or watermark. Keep the gate opening empty so story-state barriers can be drawn later. No overhead beam connecting the posts. No Asian architectural cues: no torii, paifang, pagoda-like roof, ceramic tile rows, upturned eaves, decorative ridge ends, lanterns, or shrine composition. No castle gate, triumphal arch, manor entrance, fortified palisade, ruined wall, or prosperous ornament. Do not copy any specific existing game's scene or design.
Avoid: photorealism, painterly brushwork, antialiasing, smooth gradients, excessive micro-noise, giant foreground foliage blocking the route, dramatic cinematic perspective, saturated carnival colors.
```

### 門柱だけの修正B

```text
Use case: precise-object-edit
Asset type: fixed-screen side-view RPG village-gate environment background trial
Input images: Image 1 is the edit target.
Primary request: Replace only the two oversized stone-and-timber gate piers with a much narrower, closer pair aligned to the game's existing gate coordinates. Repair the vacated areas with seamless continuations of the existing fence, low shrubs, forest floor, and distant mist.
Gate geometry: make each gate pier only about 4 to 4.5 percent of the full image width. Center the left pier at about 50 percent of image width and the right pier at about 58.5 percent. Leave a clear empty inner passage about 4 to 5 percent of image width between their inner edges. Both piers keep their current practical European design: rough local stone base, one dark oak inner post, and one small steep weathered slate cap. Their height, ground contact, material, lighting, and pixel-art treatment should match the original, but their silhouettes must be slimmer and less estate-like. The two piers remain completely separate and are not joined overhead.
Invariants: preserve the exact 16:9 straight-on framing, partial European cottage at far left, chimney, blue-green window glass, left dry-stone wall and oak fence, cultivated fields, distant hills, turquoise sky, all clouds, all birches, the ancient dark oak at far right, forest depth, packed-earth road, lighting direction, color palette, hard pixel clusters, and every non-pier element from Image 1. Keep the horizontal walking band and calm lower dialogue-UI area unchanged.
Constraints: change only the two gate piers and the small areas directly exposed by narrowing/repositioning them. The gate passage stays empty. Add no people, characters, hunters, animals, monsters, weapons, equipment, crates, cloth, banner, rope, knot, gate leaf, barrier bar, cart, footprints, particles, UI, border, text, letters, readable sign, symbol, logo, or watermark. No overhead beam. No torii, paifang, pagoda-like roof, ceramic tile rows, upturned eaves, decorative ridge ends, lanterns, shrine cues, castle gate, archway, manor entrance, or monumental masonry. Preserve crisp hand-placed pixel art with no antialiasing, painterly smoothing, or gradients.
```

## 6. 採用判定

画風、村と森の接続、独立した欧州農村門柱の方向が承認された。v33で960×540派生を正式Manifestへ登録し、第一章・第二章の全村門パネルへ接続した。足跡、警告布、狩人装備、横木、人物は動的層に残す。正式採用の詳細は `docs/concepts/village-gate-background-adoption-v33.md`。
