# 遺跡前の背景採用 v59

> 採用日：2026-09-24  
> 対象：`ruin_approach`  
> 状態：正式採用・本編接続・自動検証済み

## 正式素材

- `src/assets/series2/backgrounds/ruin_approach/middle.png`
- 960×540、不透明、遺跡地域パレット192色
- SHA-256：`43bbcefac8399e502765828eb0015b134e30505b7ec894af58b015871e130c35`
- Manifest ID：`background.ruin_approach.middle`

正式画像は起動時にManifestから読み、未読込・不正寸法ならコード景観 `renderRuinExterior(..., "approach")` へ戻る。森、石積み、右の入口、路面は静景。名喰い蛭、王国の校訂印、十年前を示す刻み、人物、冷光の微粒子、会話、UIは動的層である。

## 色設計

- 遺跡前v59を、森パレットに依存しない遺跡地域パレットの起点とした。
- 暗部は濃藍のまま、中間色に群青と青緑、記憶の差し色に菫、石の縁に古金を残す。画面全体への単純な彩度補正ではない。
- `renderRuinApproach` は入口奥の弱い青緑反射と少数の微粒子だけを重ねる。生成景観の色面を壊す大きな発光や霧は足さない。

## 本編接続

- `guardian_handwriting_seen` 後、結び木の右端から入る第三章三画面目として接続する。
- 名喰い蛭はx180、通行止めはx206〜234。退かせるまでは校訂印の調査点へ近づけない。
- 校訂印は `drawRuinApproachClue` でx353〜373の石面へ重ねる。二重枠と中央の欠損で古い校訂印、5個二列の計10刻みで十年前を示す。背景生成の曖昧な記号や文字は証拠に使わない。
- 調査会話で `royal_revision_mark_found` と `knowledge:royal_revision_ten_years` を立て、目的を「遺跡の外庭へ入る」へ更新して `ruin_courtyard` を開く。
- DEV背景比較では `A` で入り、`U` で名喰い蛭／校訂印／記憶後、`G` で正式画像／コードfallback、`C` で静景を切り替える。

## 検証

- `npm run verify:ruin-approach-trial`：選定原本、遺跡地域192色、路面162、480×270からの整数2倍、正式画像との一致。
- `npm run verify:ruin-approach-scene`：正式画像／fallback、名喰い蛭の通行止め、校訂印と十年前の刻み、知識フラグ、外庭への遷移。
- `npm run verify:assets`：正式28エントリの寸法・透過・ハッシュ・欠落・余分なファイル。
- `npm run build`：TypeScriptと本番build、127 modules。
- `npm run verify:bundle`、`verify:panels`、`verify:story-battles`、`balance:series2`、`verify:scope`、`verify:canon`：本番境界、全編因果、戦闘、正典の回帰。

新規保存から単一EDまでの手動通しは別の必須項目として残る。次の景観制作対象は、遺跡地域パレットを引き継ぎつつ封印衛と反響記号の余白を作る `ruin_courtyard`。

