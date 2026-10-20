# 結び木の背景採用 v57

> 採用日：2026-09-24  
> 対象：`knot_tree`  
> 状態：正式採用・本編接続・自動検証済み

## 正式素材

- `src/assets/series2/backgrounds/knot_tree/middle.png`
- 960×540、不透明、森パレット137使用色
- SHA-256：`80fe665348fb07d7c8c3d55d71e1d918f6fe41024eb93a0662ad54ecbcdaf3ce`
- Manifest ID：`background.knot_tree.middle`

正式画像は起動時にManifestから読み、未読込・不正寸法ならコード景観 `renderDeepForest(..., "knot")` へ戻る。閉じた天蓋、周囲の森、一本の古木、地面は静景。白枝鹿、左下がりの刻み、紐と二重結び、人物、粒子、会話、UIは動的層である。

## 本編接続

- `masked_guardian_warning` 後、深い森の右端から入る第三章二画面目として接続する。
- 白枝鹿はx180、通行止めはx206〜234。退かせるまでは古木の調査点へ近づけない。
- 鹿を退かせるとx350の古木を調べられる。画面上の刻みと二重結びは `drawKnotTreeClue` で正式背景の樹皮へ重ね、ImageGenの曖昧な記号を物語上の証拠に使わない。
- 調査会話で `guardian_handwriting_seen` と `knowledge:left_falling_marks` を立て、目的を「王国印のある遺跡へ向かう」へ更新して `ruin_approach` を開く。
- DEV背景比較では `Q` で入り、`U` で鹿／古木の刻み／記憶後、`G` で正式画像／コードfallback、`C` で静景を切り替える。

## 検証

- `npm run verify:knot-tree-trial`：選定原本、森パレット137使用色、路面162、480×270からの整数2倍、正式画像との一致。
- `npm run verify:knot-tree-scene`：正式画像／fallback、白枝鹿の通行止め、刻みと二重結び、知識フラグ、遺跡前への遷移。
- `npm run verify:assets`：正式27エントリの寸法・透過・ハッシュ・欠落・余分なファイル。
- `npm run build`：TypeScriptと本番build、126 modules。
- `npm run verify:bundle`、`verify:panels`、`verify:story-battles`、`balance:series2`、`verify:scope`、`verify:canon`：本番境界、全編因果、戦闘、正典の回帰。

新規保存から単一EDまでの手動通しは別の必須項目として残る。`ruin_approach` はv59で正式採用済み。次の景観制作対象は `ruin_courtyard`。
