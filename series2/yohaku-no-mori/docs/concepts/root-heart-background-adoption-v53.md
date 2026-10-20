# 守護樹心部の背景採用 v53

> 採用日：2026-09-18  
> 対象：`root_heart`  
> 状態：正式採用・本編接続・自動検証済み

## 正式素材

- `src/assets/series2/backgrounds/root_heart/middle.png`
- 960×540、不透明、森パレット138使用色
- SHA-256：`59c3d3757d30ca355adde6cc1423ecb39cd910458ea702b1b94659f05123b92f`
- Manifest ID：`background.root_heart.middle`

正式画像は起動時にManifestから読み、未読込・不正寸法ならコード景観 `renderDeepForest(..., "root_heart")` へ戻る。太い根、岩、路面、上段の心核は静景。根の呼吸光、根の番人、折れた弓、戦後の伏せた枝先、負傷／起立する狩人頭、人物、会話、UIは動的層である。

## 本編接続

- 根の番人はx302に置き、x330の通行止めを守る。勝利は「撃破」でなく、番人が根を伏せて縄張りを譲る決着。
- 勝利後、白根の杖（攻撃+20）を戦闘リザルトで自動装備する。勝利台詞にも、ほどけた白根が杖になる一文を加えた。
- 狩人頭はx388。救出会話までは負傷姿勢、会話後は起立姿勢へ変わり、`chapter2_complete` を立てて村への帰路を示す。
- 第三章開始前は右の深い森へ抜けられず、`chapter3_started` 後だけ `deep_forest` へ接続する。
- DEV背景比較では `I` で入り、`U` で「番人戦前／狩人頭救出／救出後」、`G` で正式画像／コードfallbackを切り替える。

## 検証

- `npm run verify:root-heart-trial`：選定原本、森パレット138色、路面162、480×270からの整数2倍、正式画像との一致。
- `npm run verify:root-heart-scene`：正式画像／fallback、番人表示と通行止め、白根の杖+20、狩人頭救出、章フラグ、第三章への遷移。
- `npm run verify:assets`：正式25エントリの寸法・透過・ハッシュ・欠落・余分なファイル。
- `npm run verify:story-battles` と `npm run balance:series2`：完全一致語契約と全25戦の成長曲線。
- `npm run build`：TypeScriptと本番build、124 modules。

新規保存から単一EDまでの手動通しは別の必須項目として残る。後続の `deep_forest` はv55で正式採用済みで、次工程は `knot_tree`。
