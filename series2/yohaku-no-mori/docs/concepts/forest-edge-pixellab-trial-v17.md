# 森入口：PixelLab試作記録 v17

> 生成・確認日：2026-08-31  
> 状態：背景A/Bを生成・原本保存。どちらも接地未合格、本番未採用。  
> 対象：第二章 forest_edge。画風と制作方式の小規模比較。

## 結論

白樺の樹皮、葉の塊、青緑の遠景は材質の参考になる。簡略人物の中央での輪郭と会話窓の可読性は維持できた。
ただし、A/Bとも地面の境界が設計y176より約40〜50px低く、人物・狼・足跡が浮く。下端にはほぼ白い単色帯もある。
Bは地面位置を強調して再生成したが、問題は解消しなかった。合格・完成素材として扱わない。

生成は2件で停止した。画風のユーザー確認と、接地を確実に固定できる制作方式の検討を次の工程にする。
主人公の足元、調査点、会話窓や本編の進行は画像に合わせて動かさない。

## 生成条件と原本

| 項目 | A | B |
|---|---|---|
| モデル／ツール | PixelLab Pro / create_image_pro | 同左 |
| job ID | 42b0cd26-06e7-4dc6-bd86-2f3e38ff71b6 | ea6325de-b07c-4b34-9af1-5a3d2b8c8ad7 |
| seed | 83117 | 83118 |
| 指定／実寸 | 480×270 / 480×270 | 480×270 / 480×270 |
| 背景・透過 | no_background=false / 全画素不透明 | 同左 |
| 構図参照 | forest-edge-layout-reference-v16.png（960×540） | 同左 |
| スタイル参照 | なし | A原本。color_palette / detail / shading |
| 原本 | forest-edge-pixellab-a-v1.png | forest-edge-pixellab-b-v1.png |
| 生成枠 | 40 | 40 |
| 加工 | なし | なし |
| 状態 | 材質参考／接地未合格 | 修正試行／接地未合格 |

原本はこの文書と同じ docs/concepts/ に保存。PNGを返却されたバイトのまま保存し、クロップ・補色・再圧縮していない。
比較画面だけでnearest-neighborの整数2倍（設計480×270→内部960×540）として表示する。
背景完成規格960×540と本番画像目録は変更していない。

生成前後の残高照会：残り1143→1063、使用857→937。今回2件の各40枠と一致する。USD creditは前後とも0.00。
Bの最初の送信はdescriptionの2000文字上限で入力検証エラーとなりjobは作成されなかった。1882文字へ短縮した下記を実送信した。
認証はCodex再起動後に復旧確認済み。APIキーをこの記録やソースへ保存していない。

### SHA-256

- 構図参照: ccc39b99959e2213d1c13296a20359ae99cdc9e323666fd5a398ed201c6179f2
- A: ef52069d816dd76ea94e5c258757afbf8b412ac1bf98900c28171dd27cf8a7ee
- B: 87c2b059bf3e9dfdb6ffc724b7bee860f3693dd297f6cdb4c35c0f2aa6579fef

## Aの実送信プロンプト

```text
Create one original pixel-art environment background for a fixed-screen side-view narrative RPG: the entrance to a living forest on a quiet morning.

Use the supplied reference for composition and spatial layout only. Replace its provisional rectangular blocks with expressive, readable pixel clusters and natural materials. Do not reproduce guide labels or interface elements.

Wide 16:9 composition, 480 by 270 design grid. Pale white-barked birches on the left connect this place to the village boundary. Fine, low-contrast trunks recede into clear blue-green air in the center. Larger dark mossy trunks and leaf masses frame the outer edges and the right-hand forest. Keep the horizontal passage open from left to right. The walkable ground line is at y=176, about 65 percent of the image height. No steps, cliffs, platforms, or top-down paths.

Rich but restrained young greens, cool turquoise distance, warm muted gold on leaf edges, damp earth and a few tiny ochre flowers at the edges. Three distinct depth planes. Hand-placed-looking pixel clusters, controlled highlights, readable silhouettes, modest texture density. The center around y=128 to y=176 must remain quiet enough for a small character. Leave a low-contrast damp-soil patch near x=132, y=165 for tracks to be drawn separately. Keep the area behind a creature at x=302 uncluttered.

Static environment only. No people, creatures, footprints, runes, writing, letters, logos, UI, frames, or guide marks. No baked light shafts, fog overlays, floating particles, or glow effects; those are separate game layers. Natural diffuse light on surfaces is welcome. No photographic texture, smooth vector outlines, painted brushstrokes, or 3D rendering. Do not copy any existing game's specific scene or character design.
```

reference_imagesのusage:

> Composition and spatial layout only. Original game background, native 960x540 corresponding to a 480x270 design grid. Preserve open horizontal passage, tree framing and quiet central character band. Do not copy the provisional rectangular texture style.

## Bの実送信プロンプト

```text
Original side-view pixel-art forest entrance, 480x270. Match the STYLE reference's natural bark, clustered leaves, olive greens, muted gold and turquoise depth, NOT its ground height.

CRITICAL LAYOUT: broad flat dirt ground fills the ENTIRE bottom 100 pixels, y=170 through y=269 (37% of the frame). Its back edge runs horizontally across the FULL WIDTH at y=165-170. Tree bases and roots meet this edge at y=165 or above, NEVER at y=215 or y=225. The area below y=177 is ground, not trunks or distant forest. A character's feet stand at y=176. Shorten the forest vertically to preserve this higher ground boundary. NO bottom-edge-only path. NO path receding toward the center. NO platforms, steps or cliffs.

Use the COMPOSITION reference for the HIGH horizontal ground boundary, tree framing and quiet character band, not its provisional rectangular textures. White-barked birches frame the left village boundary. Large dark mossy trunks frame the outer edges and right. Fine subdued distant trunks recede into clear blue-green air. Three depth planes ABOVE y=165. Leaf masses mostly above y=105. Keep y=128-176 uncluttered for small characters and a wolf at x=302.

Rich restrained young green and olive foliage, warm muted gold leaf edges, tiny ochre flowers only near the edges. Leave low-contrast damp soil at x=94-178, y=150-183 for separate footprint graphics. Lower foreground below y=190 is subdued muted brown-green dirt with sparse pixel clusters, to sit behind the dialogue window.

Crisp hand-placed-looking pixel clusters, expressive natural materials, modest texture density. 16:9 fixed side-view horizontal stage, not overhead view. Static opaque scenery only. NO people, creatures, footprints, writing, labels, grid, UI, frame, photographic texture, brushstrokes, 3D, light shafts, glow, fog overlays or particles. Do not copy an existing game's specific designs.
```

reference_imagesのusage:

> COMPOSITION ONLY: high ground starts near y=170 of a 270px design, filling bottom 100px. This 960x540 reference has doubled coordinates. Preserve ground position, open character band and tree framing, not blocky textures.

## 同条件比較と観察

DEV「ためす（開発）」→「背景　4地域比較」→2で森入口を開く。

- G：コード版→A→B。A/Bの見出しに「接地未合格」と明記。
- U：探索HUD→足跡の会話→狼の会話。会話は本編と同じDialogueBox、同じ本文を使用。
- P：主人公の位置をx220→114→382へ切替。足元はすべてy176。
- F：共通の光・薄霧・粒子を切替。足跡は別のコード層のまま。
- C：通常→静的背景→構図ガイド。選択中の背景を表示する。
- S：常にコード版の文字なし構図PNGをプレビューし、保存リンクを表示する。生成版やガイドは書き出しに混ぜない。
- TAB／ESC：4地域比較へ戻る。左右キーは地域変更であり、人物の歩行操作ではない。

探索HUDは共通関数を使用。下部の目的・操作案内は比較板用であり、本編そのものの操作画面ではない。
比較は専用Playerを使い、ユーザーのセーブ・進行フラグを変更しない。

| 観察点 | 結果 |
|---|---|
| 白樺・葉・奥行き | コード版から質感が増えた。色の採用はユーザー確認待ち |
| 中央の人物、狼、会話文 | 960×540表示で輪郭と文章を読める |
| 左側の人物 | 白樺・枝の高密度域に重なる。接地修正後に再審査 |
| 足元と調査点 | 不合格。人物・狼・足跡が地面より上へ浮く |
| 地面位置の再指示 | Bでも改善しなかった。数値の文章指定だけでは固定できていない |
| 下端の不要帯 | Aはy263〜269の7行、Bはy265〜269の5行が全幅#fefffd。アルファ透過ではない |
| 後載せの光 | 中央は読めるが、構図修正後に明るさを再評価する |
| 生成内の文字・生物・足跡 | 目視上なし。ゲーム側の足跡・狼と混同しない |
| 書き出し | B・ガイド表示中も出力PNGは元の構図参照と一致 |
| 480×270相当 | サイズ変更の反映後にCSS480×270を確認して再撮影。中央の人物と会話文は読める。接地問題は同じ |

### 画面記録（1280×720、ゲーム領域960×540）

- forest-edge-code-comparison-v17.png
- forest-edge-pixellab-a-comparison-v17.png
- forest-edge-pixellab-b-comparison-v17.png
- forest-edge-pixellab-b-dialogue-v17.png
- forest-edge-pixellab-b-guide-v17.png

640×480の検査画面（ゲーム領域480×270）：

- forest-edge-pixellab-b-1x-v17.png
- forest-edge-pixellab-b-dialogue-1x-v17.png

ビューポート変更直後の初回撮影は縮尺・余白が崩れた。反映後のCanvas寸法とCSS寸法をDOMで確認して撮り直し、上記の正常な記録だけを保存した。

これらは生成入力でなく、UIや画面外余白を含む検査記録。
保存後、比較板の下部案内を「比較専用」に明確化したため、初回キャプチャとは案内文が異なる。

## 次の作業

1. 背景の色・材質の方向をユーザーと確認する。今回のA/Bを採用画像へ自動昇格しない。
2. 接地y176を固定する部分修正、または樹林・地面を分ける制作方式を検討する。次のツールの参照・マスク仕様を実行前に確認する。
3. 下端の明色帯を含め、1画面全域に必要な背景が存在する候補を作る。元の原本は残す。
4. 人物の中央・左・右、足跡、狼、共通UI、光あり／なしを修正後に再検査する。今回確認した480×270相当と960×540表示の両方を再検査する。
5. 背景の方式が決まってから白樹の獣、成人主人公、セナへ進む。アニメーションや他地域の量産は先送り。

## 利用条件

2026-08-31に[PixelLab利用規約](https://www.pixellab.ai/termsofservice)（表示更新日2025-11-23）と[公式FAQ](https://www.pixellab.ai/docs/faq)を確認。
サービス規約上、生成出力の商用・非商用利用、改変・配布は許可される。排他的な著作権や第三者権利の非侵害が保証される、という意味ではない。
モデル学習用途の制限および規約が参照する[CreativeML Open RAIL-M](https://github.com/CompVis/stable-diffusion/blob/main/LICENSE)の利用制限も確認した。
今回の原本は開発資料のみで配布未採用。採用時にも第三者権利・最終加工・配布範囲を記録する。
Proの参照機能とサイズ・生成枠は[公式Pro説明](https://www.pixellab.ai/docs/tools/create-sl-image-pro)および実際のMCP応答で確認した。

## 回帰検証

- build、verify:dist、verify:panels、verify:bundle、verify:save、verify:intro-battle、verify:story-battles、lint:series2、balance:series2、verify:scope、verify:canonの11項目が通過。
- verify:bundleにDEV資料パス・候補名・未合格ラベルの混入検査を追加。本番は5ファイルで、生成PNG・比較資料・DEV入口は含まれない。
- git diff --check通過。既存のLF/CRLF変換警告のみ。改行設定を変更して回避していない。
- ブラウザのwarn/errorは検査時0件。原寸プレビューの保存リンク・戻るボタン・Escape終了を確認。
- 構図PNGの出力は選択中の候補やガイドに影響されず、保存済み原本と一致した。
新規保存から単一EDまでの全編手動通しは今回の対象外であり、未完了のまま残す。
