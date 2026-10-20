# 反響回廊の背景採用 v51

> 日付：2026-09-18  
> 状態：本編・正式Manifest・DEV比較へ接続済み

## 採用内容

v50選定原本Bの派生を第二章 `echo_gallery` の静的背景として採用した。採用ファイルは `src/assets/series2/backgrounds/echo_gallery/middle.png`（960×540、正式森パレット使用137色、SHA-256 `a7a0b8d4281b856b6cccbb1cbc76c71c2f81a5ba048bdff3fa94bf66b605aa43`）。初稿A、選定原本B、両プロンプト、変換工程は `echo-gallery-background-trial-v50.md` に保持する。

正式画像は起動時にManifestから読み、未読込・不正寸法ならコード景観へ戻る。根、岩、左右の白い繊維、路面は静景。白枝鹿、角へ掛けた外套、攻略後に足元へ置かれた外套、人物、反響光、会話、UIは動的層である。中央の繊維を除いたため、白い枝角と外套の輪郭を暗い岩面から読み取れる。

## 検証

- `npm run build`：123モジュール、成功。
- `npm run verify:assets`：正式24エントリの寸法・透過・ハッシュ・欠落・余分なファイルを確認。
- `npm run verify:bundle`：28ファイル。生成原本と比較資料の混入なし。
- `npm run verify:echo-gallery-trial`：選定原本B、森パレット使用137色、路面162、480×270からの整数2倍、正式画像との一致を確認。
- `npm run verify:echo-gallery-scene`：画像あり／なしの両方で、根洞窟入口からの入場、白枝鹿と外套、通行止めと解除、守護樹心部への遷移を実Sceneで確認。
- ブラウザDEV比較で初稿Aの重なりを発見し、中央の繊維だけを編集。主人公を鹿から32px離した比較位置で、鹿と背景の分離を確認した。

新規保存から単一EDまでの手動通しは別の必須項目として残る。後続の `root_heart` はv53で正式採用済みで、次工程は `deep_forest`。
