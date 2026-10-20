# 罠の道 背景試作 v38

> 日付：2026-09-15  
> 状態：内蔵ImageGen生成・森パレット変換・実Scene三状態比較済み／2026-09-15にv39として正式採用  
> 生成方式：Codex組込みImageGen

以下の未登録・未採用の記述はv38試作時点の履歴。現在の本編採用は `snare-path-background-adoption-v39.md` を参照。

## 景観と物語上の役割

涸れ沢の次の `snare_path`。狩人の壊れた罠を森の蔓が取り込んだ場所。静的な景観には古い杭と切れた紐だけを置き、襲いかかる蔓、仮面の守人、会話、UIは本編の動的層で描く。左から右へ連続する路面上端162・足元176を守る。

## 保存物

| ファイル | 寸法 | bytes | SHA-256 |
|---|---:|---:|---|
| `snare-path-imagegen-a-v38.png` | 1672×941 | 2,954,693 | `8f649bb61c715ad6c37acecd3de9fc0f58d3421939e932831666f54fcbd5e7bb` |
| `snare-path-game-palette-v38-1x.png` | 480×270 | 282,514 | `54e905b3f3e49abf27a8ebd8820b0b200e9857e60f7407e1e0c4f8884ed25309` |
| `snare-path-game-palette-v38.png` | 960×540 | 330,637 | `3b413ecce398081ed8587368facee3aa4d62f5916f2eb75e43eace6533cac682` |

## 変換と比較

`tools/prepare-snare-path-v38.ts` が原本と正式森入口のハッシュ・寸法を確認し、原本路面上端560をゲーム座標162へ対応させる。森背景の138色パレットへ重み付きRGB距離で写像し、使用137色。480×270から補間なしで厳密な整数2倍にする。`npm run verify:snare-path-trial` で再現できる。

DEV「背景　4地域比較」のTキーで保存を変えない実SideViewScene比較へ入る。Gで画像とコード、Uで「蔓との対峙」「守人の出現」「守人が去る」を切り替える。現時点では正式Manifestに登録せず、本編の通常進行はコード背景のまま。比較資料は本番bundleから除外。ブラウザでは三状態、コード版への復帰、守人との会話開始を確認した。次に通常導線での蔓戦から守人会話までの一連の進行を確認してから採用を判断する。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: original side-scrolling RPG environment background for “Yohaku no Mori”, scene “Snare Path”; landscape 16:9.
Primary request: A narrow woodland trail immediately beyond a dry pale creek, leading deeper into an old forest. The place feels watchful and subtly tense, before a forest guardian appears.
Scene/backdrop: Layered temperate forest, slim pale birch trunks receding into cool teal mist, rich mossy green canopies, dark damp understory. Broken old wooden hunting stakes and weathered cord fragments can be visible BEHIND the trail, but no active traps or vines on the walking path. The central ground should show worn ochre-brown soil and stones, a little darker and more root-bound than the preceding dry creek. A branching root texture in the banks gives this location identity.
Style/medium: Finely crafted, colorful pixel-art environmental illustration with crisp square pixels, clustered shapes, richly nuanced but controlled color, no smooth airbrushing or antialiasing. Original game art, evocative and handmade.
Composition/framing: Strict side-view stage for a 480x270 game canvas, composed wide. Continuous nearly horizontal, open walking strip across the full image, its far edge at y≈162/270 and character feet at y≈176/270; keep the actual y=162–180 band free of large obstacles and distracting high-contrast objects. Forest trunks and banks stay behind that line. Keep an open readable zone at x≈170 for a moving enemy and x≈350 for a masked character drawn later in game; do not depict either. Traversable left and right exits.
Lighting/mood: Soft filtered daylight, cool mist through distant trees, warm soil, gentle luminous leaf highlights; vivid but natural.
Constraints: scenery only; no people, creatures, magical effects, active vines, UI, lettering, watermark, borders, or interface. No East Asian architecture. No gradients as final art; solid pixel clusters. Maintain clear separation between forest and ground for dark-green character silhouettes.
```
