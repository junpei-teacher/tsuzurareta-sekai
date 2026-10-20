# 森入口：地面分離・接地調整 v18

> 更新日：2026-08-31  
> 状態：背景の質感はユーザー承認済み。配置Cの接地・UI比較済み、本番未採用。  
> 前工程：[v17試作記録](forest-edge-pixellab-trial-v17.md)

## 決定

ユーザーから背景の質感が理想的との確認を得た。白樺、青緑の奥行き、葉の描き込みを本作の背景制作基準とする。
A原本は再生成・上書きせず保持する。承認は質感の方向であり、旧A/Bの接地不良を採用する意味ではない。

## 部分修正の試行と制約

PixelLab inpaint_imageへ、A原本の下側だけを修正する矩形マスクを送信した。

- job: fc8336ac-8439-45be-8e9a-9fea1c17173d
- 入力：A原本。マスクx0 / y138 / 幅480 / 高さ132、crop_to_mask=true、seed83119
- 結果：失敗。「Tier 2 is required for this」
- 出力画像：なし。残高は前後とも1063で変化なし。
- 契約変更は行わず、この制限への同じ要求の再送もしていない。

現在のTier 1で利用できるCreate Image Proを使い、新しい地面素材を1枚生成する方式へ変更した。
元の画像を編集するのでなく、ゲームの描画時に森林と地面を配置する。別サービスへ切り替えていない。

### 失敗した部分修正の指示

```text
Repair only the masked LOWER portion of this side-view pixel-art forest background. Keep the unmasked upper forest pixel-identical: the approved white birches, olive leaf clusters, turquoise air and palette must not change.

The old dirt path was much too low. REPLACE the lower region with a much higher, broad flat dirt ground plane. Finish the visible trunks with natural short mossy roots around y=149 to y=156. From y=157 all the way to the bottom y=269, the entire width must be continuous earth, not standing tree trunks or distant forest. A small character's feet stand on this ground at y=176. No cliff face, platforms, steps, fences or receding vertical path.

Blend the top of the repair into the existing trunks and turquoise distance. Keep the path horizontal. Muted olive-brown packed dirt and damp soil, matching the original earthy palette and crisp pixel clusters. Quiet low-contrast ground from x=80 to x=355, especially a smooth damp-soil patch at x=94-178, y=150-183 for footprints to be drawn later. Very sparse texture; roots and small grasses only at the back edge and extreme sides. The bottom half of the dirt stays unobtrusive behind a dialogue window.

Fill every pixel down to the bottom edge with matching earth; replace the off-white strip entirely. No blank margins, borders, white strip or transparency. No people, animals, footprints, writing, symbols, UI, fog, light shafts, glow or particles. Do not change the existing pixel style or recolor the upper scene.
```

## 新しい地面素材

| 項目 | 記録 |
|---|---|
| ツール | PixelLab create_image_pro |
| job | dd1ba220-e2bc-40a5-b683-d04fbd2c6c84 |
| seed | 83120 |
| 指定／実寸 | 480×128 / 480×128 |
| 原本 | forest-edge-ground-v18.png |
| スタイル参照 | forest-edge-pixellab-a-v1.png |
| 参照項目 | color_palette / detail / shading |
| 透過 | no_background=false、全画素不透明 |
| 原本加工 | なし |
| 下端の明色帯 | なし（全幅がRGB各240以上の行は0） |
| SHA-256 | 0f4736ed50db51b5da6ac7e90f2df7333b31ffcfb31852970470693e02e038fb |

A原本のSHA-256はv17と一致：ef52069d816dd76ea94e5c258757afbf8b412ac1bf98900c28171dd27cf8a7ee。

地面生成の受付応答は40枠と表示したが、完了後の残高差分は1063→1038（使用937→962）、25枠だった。
費用を40枠消費と断定しない。[公式Pro説明](https://www.pixellab.ai/docs/tools/create-sl-image-pro)にもアスペクト比で枠数が異なる旨がある。確認日2026-08-31。

### 実送信プロンプト

```text
A single wide opaque pixel-art texture strip of quiet packed forest earth, for the foreground ground layer of a side-view RPG. Canvas 480x128. This is ONLY THE GROUND MATERIAL, not a forest landscape or a complete scene.

Fill the ENTIRE rectangle from edge to edge with continuous subdued olive-brown dirt. Use the supplied style reference ONLY for its ground palette and crisp pixel-cluster texture: muted tan-olive highlights, earthy brown midtones, a few darker damp patches. No cyan sky colors. Sparse small horizontal clusters, modest contrast, a calm middle area with few marks so separate footprint graphics and small character feet remain readable. A few tiny flattened grass tufts at the extreme upper edge only. Match the reference's hand-placed-looking pixel grain; no smooth gradients or photoreal texture.

No standing trees, trunks, roots, branches, buildings, people, animals, footprints, rocks or objects. No sky, horizon, road receding into depth, vertical dirt cross-section, platforms, borders, blank margins, white stripes, text, symbols, UI, lighting effects, fog or particles. No transparency. Every pixel should be earth material all the way to the bottom edge.
```

## 配置Cの描画構成

実装：src/fx/forestEntranceLayers.ts。現在はDEV比較画面からのみ使用。

1. 地面480×128を、設計座標x0 / y142へ等倍で置く。下端y270まで埋まる。
2. A原本のy64〜262を上へ64px移動して置く。幹・葉を圧縮・引き伸ばししない。
3. 原本の下端y263〜269の明色帯は描画対象外。原本から削除はしない。
4. 合成のy187〜198は1px行ごとの透明度で地面へつなぐ。画像の補間・ぼかしは使わない。2pxの規則的な網目は帯に見えたため採用しなかった。
5. 足跡周辺には、地面素材の低密度部分を段付きの土の形で重ねる。薄く元の模様を残し、湿った土として少し暗くする。
6. 靴跡・爪跡の位置と数は変更せず、配置Cでは土になじむ暗い茶色にする。旧コード版の足跡色は維持。
7. 人物・狼・足跡・光・会話窓は独立したコード層。人物と狼の接地はy176、調査点x132、狼x302、会話窓y182を維持。

カメラ位置変更でAの上端64pxは画面外になる。元の画風は維持するが、見える構図まで同一ではない。
これはパララックス用の完全な三層素材ではなく、森林＋地面の二枚を使う配置試作。
全背景をこの切り出し方式で量産する決定ではない。

## 操作と書き出し

DEV「ためす（開発）」→「背景　4地域比較」→2。

- G：コード→A→B→配置C
- U：探索HUD→足跡会話→狼会話
- P：主人公x220→114→382。足元y176固定
- F：光・薄霧・粒子の切替
- C：通常→静的背景→ガイド
- S：従来どおり、コード版の生成用構図PNGをプレビュー／保存
- E：選択中の人物・狼・足跡と会話/HUDを重ねた960×540合成PNGをプレビュー／保存。DEV操作バーは含めない

SとEを分け、人物や文字入りの合成を生成用構図PNGと取り違えないようにした。
保存ダイアログには本番未採用と表示する。比較画面はセーブや進行を変更しない。

## 検査

- 960×540とCSS480×270で中央の人物・狼・足跡・会話窓を確認。さらに人物x114/x382と光なしを確認した。接地y176で人物・狼が地面に立つ。
- 靴跡と獣の足跡が静かな土の面に載り、模様との競合が減った。配置の数・座標は不変。
- 文字なし／ガイドを確認。Sの出力PNGはv16参照とバイト一致。Eの合成は960×540でDEV操作バーを含まない。
- 書き出しの戻るボタン、Escape終了を確認。検査時のブラウザwarn/errorは0件。
- build、verify:forest-art、verify:dist、verify:panels、verify:bundle、verify:save、verify:intro-battle、verify:story-battles、lint:series2、balance:series2、verify:scope、verify:canonの12項目が通過。
- 本番出力は5ファイル。配置Cや地面の資料は混入しない。本編の背景は従来のコード版のまま。

### 画面記録

- forest-edge-layered-composite-v18.png：ゲーム内Eから保存した960×540合成。人物・狼・足跡・光・会話窓あり。
- forest-edge-layered-native-v18.png：960×540表示のDEV比較画面。
- forest-edge-layered-left-v18.png / forest-edge-layered-right-v18.png：人物の左右位置・光なし。
- forest-edge-layered-guide-v18.png：接地と会話帯のガイド。
- forest-edge-layered-small-v18.png / forest-edge-layered-small-dialogue-v18.png：480×270相当。

これらは新しく生成した一枚絵ではなく、原本とコード層を合成した検査記録。本素材の採用・全編手動通しの完了とは区別する。

verify:forest-artを追加。原本ハッシュ、寸法、不透明、地面の不要帯、接地y176、整数配置、画面下端までの被覆を検査する。
本番Manifestは空のまま。verify:bundleへ新しい地面素材のDEV混入検査を追加した。
利用条件は2026-08-31確認の[第三者ライセンス](../第三者ライセンス.md)とv17の記録を適用し、採用時には最終加工と配布範囲を別途記録する。

## 次工程

- 配置Cの上部の切り取りと、人物・会話窓を含む全体バランスを確認する。
- 通常の森入口へ組み込む前に、採用画像の出力規格、専用Manifest、読込失敗時のコード版フォールバックを整える。
- 実際の左右歩行・足跡の調査・狼との遭遇を続けて確認してから本番採用を判断する。
- 白樹の獣、主人公、セナや他地域の量産は、この代表画面の方式確定後に進む。
