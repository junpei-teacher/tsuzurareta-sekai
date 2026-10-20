# 涸れ沢の背景採用 v37

> 日付：2026-09-15  
> 状態：本編・正式Manifest・DEV比較へ接続済み

## 採用内容

v36の候補画像を、第二章 `dry_creek` の静的背景として採用した。採用ファイルは `src/assets/series2/backgrounds/dry_creek/middle.png`（960×540、137色、SHA-256 `b2b322413e3fff88594bab9f755e8f9e6504ba24783971e7e40c6a7934eb0cda`）。生成原本、実送信プロンプト、変換工程は `dry-creek-background-trial-v36.md` に保持する。

背景は起動時に `src/core/series2Assets.ts` の正式Manifestから読み、寸法不正・読込失敗ならコード描画へ戻る。森入口と同じ路面上端162・人物足元176を保つ。人物・狼・会話・UI・空気感は描画層を分けたままにする。DEV「背景　4地域比較」のRキーも正式画像を使い、Gで画像／コード、Uで対峙／救出前／救出後を比較できる。

台本では若い狩人が罠を壊されて転がされた後、会話後に「俺は歩ける」と話す。これに合わせ、`young_hunter_rescue` だけ腰を落として片脚をかばうドット姿勢にした。救出後の `young_hunter_repeat` は通常の立ち姿へ戻る。他の狩人には影響しない。

## 検証

- `npm run build`：117モジュール、成功。
- `npm run verify:assets`：正式18エントリの寸法・透過・SHA-256などを確認。
- `npm run verify:bundle`：22ファイル。比較原本と資料画像の混入なし。
- `npm run verify:dry-creek-trial`：生成原本、137色、480×270からの整数2倍、正式画像との内容一致を確認。
- `npm run verify:dry-creek-scene`：画像あり／なしの両方で、負傷姿勢、救出会話、TORME習得、立ち姿への切替、次地域開通を実Sceneで確認。
- ブラウザのDEV比較で、救出前後の人物姿勢と森景観の色の接続を目視確認。

新規保存から単一EDまでの手動通しは別の必須項目として残る。
