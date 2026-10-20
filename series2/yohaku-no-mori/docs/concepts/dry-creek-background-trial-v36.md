# 涸れ沢の背景試作 v36

> 日付：2026-09-14  
> 状態：ゲーム寸法への変換・実Scene三状態比較済み／2026-09-15にv37として正式採用  
> 生成方式：Codex組込みImageGen

以下の未登録・立ち姿などの記述はv36試作時点の履歴。現在の本編採用と負傷姿勢の検証結果は `dry-creek-background-adoption-v37.md` を参照。

## 景観と役割

第二章の `dry_creek`。狼の向こうに取り残された若い狩人を助ける場所。森入口の青緑の遠景を引き継ぎ、乾いた灰白色・黄土色の河床、丸く摩耗した石、右岸の露出した古木の根で場所を識別する。根と大石は歩行帯の奥へ置き、路面上端162・人物足元176の水平面を守る。

参照は本作の正式森入口と白い木の境のみ。人物、狼、足跡、文字、UI、粒子は原本に含めない。生成Aの原本は保持し、既存と同じ重み付きRGB距離で森の138色へ写像する。使用色は137色。原本の路面上端550をゲーム座標162へ合わせ、480×270から厳密な整数2倍で960×540を作る。

## 保存物

すべて `docs/concepts/` 配下。

| ファイル | 寸法 | bytes | SHA-256 |
|---|---|---:|---|
| `dry-creek-imagegen-a-v36.png` | 1672×941 | 2,115,419 | `17259df8867dd1e542b1fcc5fb7847c7dfbbb976f0417268102b571ebdd157be` |
| `dry-creek-game-palette-v36-1x.png` | 480×270 | 196,711 | `1d51a109280d4da2af0aa6cd58edbe65a967960334d6b8b78a4f3a45bb7e5ab0` |
| `dry-creek-game-palette-v36.png` | 960×540 | 237,756 | `b2b322413e3fff88594bab9f755e8f9e6504ba24783971e7e40c6a7934eb0cda` |

再生成・寸法検査：`npm run verify:dry-creek-trial`。

## 比較の入口

「ためす（開発）」→「背景　4地域比較」→ **R**。

- U：狼との対峙／狩人の救出／救出後
- G：候補画像／従来のコード背景
- C：景観だけ／本編の人物・会話との合成
- H：比較操作の表示／非表示
- ENTER：本編の会話を開始・送る
- BまたはESC：比較一覧へ戻る

境界用の保存しない実Scene比較に涸れ沢の状態セットを追加して共用した。背景の注入キー `background.dry_creek.middle` は用意済みだが、正式Manifestへは未登録。通常進行はコード背景を維持する。狼・狩人・会話・出現条件は本編のSideViewSceneをそのまま使う。

## 確認結果

実ブラウザで狼との対峙と会話、狼を退けた後の若い狩人と救出会話、救出後の目的・会話入口を確認。人物の足元が平坦な河床へ乗り、右岸の根が人物や会話窓を塞がない。背景の静止PNGも原寸で確認した。

buildとbundle検証は成功。正式17エントリ・配布21ファイルを維持し、候補とDEV資料URLは配布物へ含まれない。探索人物・狼は現行のコード描画を使う。救出前の狩人の負傷姿勢は現行コードの立ち姿のままで、人物演出の後続調整項目として残る。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: original fixed-screen side-view RPG environment, 16:9 landscape.
Input images: Image 1 is the game's adopted forest entrance and Image 2 is its White Tree Boundary. Both are style references for exact pixel cluster scale, turquoise depth, moss greens, deep teal shadows and warm earth. Neither is an edit target.
Primary request: Create a distinct shallow-forest dry creek clearing where the player will rescue a young hunter. Empty environment only.
Scene: sheltered low dry stream banks with worn grey limestone and tan flat stones, exposed old tree roots along the BACK bank, a few dark aged trunks at the edges, sparse birches further away and turquoise atmospheric woodland depth. A broad very shallow DRY streambed runs horizontally across the foreground. It is a flat ford one can walk across, not a ravine. No water or waterfall. Rounded stones and compact cracked silt express lack of rain. The left side is slightly more enclosed than the forest entrance; a quiet light opening in the middle lets the rescue scene read. An exposed root fan on the right back bank provides a recognizable landmark behind the hunter, without forming an arch.
Composition: strict straight-on side-view game camera, same horizon, scale and material density as references. Back bank and roots end at about 60 percent of image height, game y162. Continuous flat walkable dry silt at feet y176 (65 percent image height). Leave the full walking band clear and level. Keep negative space around game x174 for a wolf and x330 for a hunter; they will be drawn later. Smoothly transition from brown woodland soil at both horizontal edges into a broad pale grey/tan stone-and-silt bed in the center. The lower third is quiet large pixel shapes under dialogue UI. Avoid deep perspective, diagonal receding stream, ledges, giant rocks or root barriers on the walking band.
Style: crisp polished late-16-bit/32-bit pixel-art game background, hard rectangular pixel clusters and restrained texture density matching references. Moss green, olive, pale warm limestone, old ochre roots, turquoise distance and deep teal shadows. Filtered summer morning light, warm edges on stones and roots. Slightly cooler mineral ground than the forest entrance. Original setting in a kingdom-era rural fantasy world.
Constraints: environment only, no people, hunters, corpses, monsters, wolves, animals, silhouettes, footprints, blood, weapons, bags, tents, traps, letters, glyphs, signs, ruins, architecture, bridges, treasure, UI, border, logo or watermark. No magical glow, light rays or particles baked in. No painting, antialiasing, smooth gradients, realistic photograph or 3D. No recognizable composition from another game.
```
