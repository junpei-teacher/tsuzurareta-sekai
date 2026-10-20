# 森入口：PixelLab少数試作指示書 v1

> 対象：第二章 `forest_edge`／背景1画面  
> 更新日：2026-08-31  
> 状態：v17でA/Bを生成・比較。両方とも接地未合格、本番未採用。実績は `forest-edge-pixellab-trial-v17.md`。

## 1. 今回の到達点と再開条件

村へ報告して森へ踏み込む最初の一画面を、背景の質感を決める代表試作にする。
全地域の描き込みや人物アニメーションの量産にはまだ進まない。

2026-08-31の最初の残高確認は認証エラーだったが、ユーザーの設定更新・Codex再起動後に復旧した。
同日にPixelLab ProでA/Bを生成し、モデル・費用・利用条件を確認した。生成枠は合計80。
どちらも地面位置が合わず、下端に明色帯があるため本番未採用。実送信プロンプト・原本・検査記録は `forest-edge-pixellab-trial-v17.md` を正とする。
APIキーを記録せず、別サービスへ自動で切り替えない。

## 2. 参照画像の作り方

実装の入口は `src/fx/storyArt.ts` の `renderForestEntrance`。
次の操作は開発モードのみで使える。本番のタイトルやセーブ仕様は変えない。

1. タイトル →「ためす（開発）」→「背景　4地域比較」。
2. `2` で浅い森を拡大。
3. `C` で通常 → 文字なし背景 → 構図ガイド → 通常を切り替える。
4. `S` で原寸プレビューを開き、保存リンクから `forest-edge-layout-reference-v16.png` を書き出す。

書き出す画像は表示モードにかかわらず、960×540の静的な背景だけ。
人物、狼、文字、HUD、会話窓、ガイド線、足跡、光芒、霧、粒子を含めない。
ダウンロードされた原本は `docs/concepts/` に保存し、本番の画像目録へ登録しない。
ガイド付きの画面を生成参照へ渡さない。通常画面とガイドは人間の比較・確認用にする。

確認用の画面キャプチャは `forest-edge-reference-screen-v16.png` に保存済み。
これは画面外の余白を含む633×598の閲覧記録で、960×540の生成入力原本ではない。
`C` の3表示は実画面で確認し、文字なし表示・ガイド表示から `S` の書き出し操作も実行した。
v17で可視の保存リンクからPNG実体を取得し、960×540・全画素不透明・文字や人物なしを確認して `docs/concepts/forest-edge-layout-reference-v16.png` に保存済み。
生成にはこの原寸PNGを使用した。閲覧記録を生成入力原本として代用していない。

## 3. 固定する構図

座標は480×270のゲーム内設計座標。960×540参照上では各値を2倍する。

| 項目 | 固定条件 |
|---|---|
| カメラ | 横から見る固定画面。見下ろし・アイソメトリックにしない |
| 左側 | 村境から続く白い木。帰路を識別できる明るい幹 |
| 中央 | 細く淡い遠景の幹と、人物の輪郭を受け止める青緑の空気 |
| 右側 | 奥へ続く森。太い暗い幹は右寄りにまとめるが出口を塞がない |
| 移動 | x24〜444。足元y176を水平につなぎ、崖・段差・ジャンプ地形を追加しない |
| 人物帯 | 成人は表示32×48。頭〜足元のy128〜176へ強い装飾を密集させない |
| 調査点 | x132付近に湿った土。二人分の靴跡と周囲の獣の足跡はコード側で重ねる |
| 敵 | 狼の配置はx302。体と顔の後ろを低コントラストにする。背景には描かない |
| 会話窓 | x16、y182、幅448、高さ76。重要な情景をこの領域だけに置かない |

コード版の四角い樹冠や単純な幹は構図の仮形であり、生成版へそのまま写す材質の指定ではない。
遠・中・近景の明暗関係と余白を維持し、葉の塊、樹皮、草、土の表情を増やす。

## 4. 色と描き込み

- 浅い森の朝。若葉、澄んだ青緑の空気、穏やかな金色の葉裏を主とする。
- 手前の暗い緑は画面端へ、中央の明るさは人物の背後へ寄せる。
- 差し色は古金を主にする。花の赤茶は端の小面積だけに留める。
- 一枚の葉を無数に描くのでなく、小さなドットの塊で材質を作る。
- 写真調、油彩の筆触、滑らかな3D、輪郭の強いぼかしを避ける。
- 『Phoenotopia: Awakening』は温かさと土地の手触りという方向の参考。固有画面・人物・意匠の再現は指示しない。

## 5. 最初の生成候補

まず静的な合成背景1枚を作り、現在の簡略人物とUIを上に載せて比較する。
これは完成した分割レイヤー素材ではない。画風の合意後、必要に応じて遠景・中景・前景を制作する。

v17では参照画像対応の `create_image_pro` を確認して使用。480×270指定で両方とも480×270のPNGを受け取り、各40生成枠を使用した。
原本はそのまま保存し、比較画面でnearest-neighborの整数2倍、960×540として描画する。
最終背景原寸はアートバイブルどおり960×540とし、無断で規格を変更しない。
参照は `usage` を「layout/composition only」と明示し、背景なので透過を要求しない。

### 初回プロンプト（v17のAに使用）

```text
Create one original pixel-art environment background for a fixed-screen side-view narrative RPG: the entrance to a living forest on a quiet morning.

Use the supplied reference for composition and spatial layout only. Replace its provisional rectangular blocks with expressive, readable pixel clusters and natural materials. Do not reproduce guide labels or interface elements.

Wide 16:9 composition, 480 by 270 design grid. Pale white-barked birches on the left connect this place to the village boundary. Fine, low-contrast trunks recede into clear blue-green air in the center. Larger dark mossy trunks and leaf masses frame the outer edges and the right-hand forest. Keep the horizontal passage open from left to right. The walkable ground line is at y=176, about 65 percent of the image height. No steps, cliffs, platforms, or top-down paths.

Rich but restrained young greens, cool turquoise distance, warm muted gold on leaf edges, damp earth and a few tiny ochre flowers at the edges. Three distinct depth planes. Hand-placed-looking pixel clusters, controlled highlights, readable silhouettes, modest texture density. The center around y=128 to y=176 must remain quiet enough for a small character. Leave a low-contrast damp-soil patch near x=132, y=165 for tracks to be drawn separately. Keep the area behind a creature at x=302 uncluttered.

Static environment only. No people, creatures, footprints, runes, writing, letters, logos, UI, frames, or guide marks. No baked light shafts, fog overlays, floating particles, or glow effects; those are separate game layers. Natural diffuse light on surfaces is welcome. No photographic texture, smooth vector outlines, painted brushstrokes, or 3D rendering. Do not copy any existing game's specific scene or character design.
```

## 6. 合格の確認

1. 原本だけでなく、主人公、狼、足跡、HUD、会話窓を合成した実画面で確認する。
2. 480×270相当と整数倍表示の両方で人物の顔、足元、敵の識別形が読める。
3. 左の白い木が森の境界とつながり、右側へ歩けることが伝わる。
4. 足跡はゲーム側の正確な配置で読め、背景の模様と競合しない。
5. 生成画像の文字や余計な生物、段差、光芒の混入がない。
6. 光・霧・粒子の後載せで明部が白く潰れない。
7. コード版との比較をユーザーへ見せ、画風の方向を確認する。

合格しても、出所・モデル・生成日・プロンプト・原本・加工内容・利用条件の確認を資産台帳へ記録するまでは本番へ採用しない。
背景の方針確認後、白樹の獣 → 成人主人公静止画 → セナ → 必要な動き、の順へ進む。

## 7. v16の構図準備時点の検証記録

- 帰村報告、ZIROR習得、出発後の空の狩具箱、森入口への移動を通常導線で確認。
- 森入口の通常表示、足跡の会話、苔背の狼の遭遇会話を確認。
- DEV背景比較の通常／文字なし／ガイドを確認。文字なしには人物・足跡・環境演出が出ず、ガイド線はガイド表示だけに出る。
- `build`、`verify:dist`、`verify:panels`、`verify:bundle`、`verify:save`、`verify:intro-battle`、`verify:story-battles`、`lint:series2`、`balance:series2`、`verify:scope`、`verify:canon` の11項目が通過。
- `git diff --check` は通過。既存ファイルのLF/CRLFに関する警告のみ。
- この時点では生成候補比較とPNG実体確認は未実施だった。v17で実施した結果は試作記録を参照。新規保存から単一EDまでの手動通しは引き続き未完了。
