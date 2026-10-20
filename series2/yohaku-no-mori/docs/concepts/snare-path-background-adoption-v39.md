# 罠の道の背景採用 v39

> 日付：2026-09-15  
> 状態：本編・正式Manifest・DEV比較へ接続済み

## 採用内容

v38の候補を第二章 `snare_path` の静的背景として採用した。採用ファイルは `src/assets/series2/backgrounds/snare_path/middle.png`（960×540、森パレット138色中137色使用、SHA-256 `3b413ecce398081ed8587368facee3aa4d62f5916f2eb75e43eace6533cac682`）。生成原本、実送信プロンプト、変換工程は `snare-path-background-trial-v38.md` に保持する。

背景は起動時に `src/core/series2Assets.ts` の正式Manifestから読む。未読込・不正寸法なら従来のコード景観へ戻る。背景には朽ちた杭と切れた紐を留め、罠喰い蔓・仮面の守人・会話・UI・薄霧は動的層のまま。DEV「背景　4地域比較」のTキーも正式画像を使う。

## 検証

- `npm run build`：118モジュール、成功。
- `npm run verify:assets`：正式19エントリの寸法・透過・ハッシュなどを確認。
- `npm run verify:bundle`：23ファイル。生成原本と比較資料の混入なし。
- `npm run verify:snare-path-trial`：生成原本、137使用色、480×270からの整数2倍、正式画像との一致を確認。
- `npm run verify:snare-path-scene`：画像あり／なしの両方で、涸れ沢からの入場、蔓による通行停止、戦闘呼出、守人の会話とフラグ、橋への開通を実Sceneで確認。戦闘勝利はコールバックで再現し、戦闘そのもののプレイ検証ではない。
- v38時点のブラウザDEV比較で対峙・守人出現・退去を目視確認。正式画像はv38派生とバイト単位で一致する。

新規保存から単一EDまでの手動通しは別の必須項目として残る。
