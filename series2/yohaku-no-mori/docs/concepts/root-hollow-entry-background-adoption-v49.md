# 根洞窟入口の背景採用 v49

> 日付：2026-09-18  
> 状態：本編・正式Manifest・DEV比較へ接続済み

## 採用内容

v48候補を第二章 `root_hollow_entry` の静的背景として採用した。採用ファイルは `src/assets/series2/backgrounds/root_hollow_entry/middle.png`（960×540、正式森パレット使用129色、SHA-256 `6587471458a1fc64212c64f09c0fef8ee5debde10c9c348618d2855b102b9dfa`）。生成原本、実送信プロンプト、変換工程は `root-hollow-entry-background-trial-v48.md` に保持する。

正式画像は起動時にManifestから読み、未読込・不正寸法なら従来のコード景観へ戻る。根、岩、左の外光、路面は静景。反響標、罠喰い蔓、攻略後のほどけた蔓、人物、会話、UI、微かな反響光は動的層である。反響標は撃破済みにせず何度でも使え、有効呪文だけでなく不発の綴りもMPを消費しない。離脱後も標は残り、蔓だけが消えて右の反響回廊が開く。

## 検証

- `npm run build`：122モジュール、成功。
- `npm run verify:assets`：正式23エントリの寸法・透過・ハッシュ・欠落・余分なファイルを確認。
- `npm run verify:bundle`：27ファイル。生成原本と比較資料の混入なし。
- `npm run verify:root-hollow-entry-trial`：生成原本、森パレット使用129色、路面162、480×270からの整数2倍、正式画像との一致を確認。
- `npm run verify:root-hollow-entry-scene`：画像あり／なしの両方で、守護樹からの入場、反響標の無料・反復試行、蔓の通行止めと解除、反響回廊への遷移を実Sceneで確認。
- ブラウザDEV比較で三状態とコードfallbackを目視。人物・標・蔓の接地、攻略後の通路、背景の描画密度を確認した。

新規保存から単一EDまでの手動通しは別の必須項目として残る。次の景観制作対象は `echo_gallery`。
