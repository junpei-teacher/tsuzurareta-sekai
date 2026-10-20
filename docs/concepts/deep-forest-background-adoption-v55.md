# 深い森の背景採用 v55

> 採用日：2026-09-24  
> 対象：`deep_forest`  
> 状態：正式採用・本編接続・自動検証済み

## 正式素材

- `src/assets/series2/backgrounds/deep_forest/middle.png`
- 960×540、不透明、森パレット138使用色
- SHA-256：`2bddae0c96323eba9a6385782dfa5de5f69089bd6d9ee9de18454ddb37eded53`
- Manifest ID：`background.deep_forest.middle`

正式画像は起動時にManifestから読み、未読込・不正寸法ならコード景観 `renderDeepForest(..., "deep")` へ戻る。閉じた天蓋、大樹、苔、地面、低い白根は静景。苔背の狼、白枝鹿、仮面の守人、人物、微かな胞子光、会話、UIは動的層である。

## 本編接続

- `chapter3_started` 後、守護樹心部の右端から入る第三章最初の屋外画面として接続する。
- 苔背の狼はx160、第一通行止めはx186〜214。狼は主人公を食べようとせず、遺跡へ向かう道だけを塞ぐ。
- 狼を退かせると白枝鹿がx330に現れ、第二通行止めx356〜384を守る。鹿の白根は侵入者を外へ返すためのものとして扱う。
- 二戦後、仮面の守人がx405で「魔物は帰そうとしている」「遺跡は名を絡め取る」と警告する。会話後に `masked_guardian_warning` を立て、右の `knot_tree` へ進める。
- DEV背景比較では `D` で入り、`U` で狼／鹿／守人／開通後、`G` で正式画像／コードfallback、`C` で静景を切り替える。

## 検証

- `npm run verify:deep-forest-trial`：選定原本、森パレット138色、路面162、480×270からの整数2倍、正式画像との一致。
- `npm run verify:deep-forest-scene`：正式画像／fallback、狼と鹿の二段通行止め、守人の警告、フラグ更新、結び木への遷移。
- `npm run verify:assets`：正式26エントリの寸法・透過・ハッシュ・欠落・余分なファイル。
- `npm run build`：TypeScriptと本番build、125 modules。
- `npm run verify:bundle`、`verify:panels`、`verify:story-battles`、`balance:series2`、`verify:scope`、`verify:canon`：本番境界、全編因果、戦闘、正典の回帰。

新規保存から単一EDまでの手動通しは別の必須項目として残る。後続の `knot_tree` はv57で正式採用済みで、次工程は `ruin_approach`。
