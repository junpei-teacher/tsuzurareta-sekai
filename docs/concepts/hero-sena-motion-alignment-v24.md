# 主人公・セナの歩行接地と別層 v24

> 日付：2026-09-01  
> 状態：DEV採用前候補。歩行接地、仮面着脱、左右別の指輪、停止復帰まで接続。本番Manifest未登録  
> 新規生成：なし／外部サービス費用：0

## 1. 目的と境界

v23で選んだ歩行候補は、主人公3枚とセナ1枚だけ靴底が1pxずれていた。
v24では32×48の生成原本を再生成・上書きせず、整数移動または既存コマの選び直しだけで接地を統一する。

セナの仮面、左手、指輪は全身画像へ焼き込まない。仮面着脱と左右向きで物語上の手掛かりを失わないコード層として、DEV比較画面へ接続する。
この工程は本番採用ではない。終戦・エンディングへの一時接続と、ユーザーの最終目視を残す。

## 2. 原本から派生候補への対応

| 派生候補 | v23原本 | 操作 | AABB | SHA-256 |
|---|---|---:|---|---|
| `hero-pixen-walk-aligned-v24-f1.png` | `hero-pixen-walk-short-v23-f1.png` | y=-1px | (5,1)〜(22,43) | `e8b5db693d7e1ba1733f9dd320d3ae6c768ac1e8517a0fea232e142e26579900` |
| `hero-pixen-walk-aligned-v24-f2.png` | `hero-pixen-walk-short-v23-f2.png` | y=-1px | (5,2)〜(25,43) | `5cf74eebe6273be2e43ab0110444f3d7071e6847164cbbd87c3353172fa6b23b` |
| `hero-pixen-walk-aligned-v24-f3.png` | `hero-pixen-walk-short-v23-f3.png` | y=-1px | (6,1)〜(22,43) | `e9646daea53cc0ae410f76b0de07a33902db291c8c05ee8e57cc3de6087c1f32` |
| `hero-pixen-walk-aligned-v24-f4.png` | `hero-pixen-walk-short-v23-f4.png` | 完全コピー | (5,2)〜(22,43) | `1527cdc1af3b72d920763da4d062e5f57b68eb1423eae2bb8c55f736360c5ea5` |
| `sena-pixen-walk-aligned-v24-f1.png` | `sena-pixen-walk-clear-v23-f1.png` | 完全コピー | (6,2)〜(24,45) | `606a36f50446a9a21746fb035ae9eddd0190c7e6c71eeb906a4e44691481ff52` |
| `sena-pixen-walk-aligned-v24-f2.png` | `sena-pixen-walk-v23-f2.png` | 接地済みコマを選択・完全コピー | (7,3)〜(25,45) | `12168b01b1f3ea1f17a5cbfaee9fce6369c5c27cc544519747c17fc9ec34eff3` |
| `sena-pixen-walk-aligned-v24-f3.png` | `sena-pixen-walk-clear-v23-f3.png` | 完全コピー | (7,3)〜(24,45) | `42fa9a1fa79a7913b0fd6762f8ea42c90d8bfc886c9f50388f4c3640a7ec87bf` |
| `sena-pixen-walk-aligned-v24-f4.png` | `sena-pixen-walk-clear-v23-f4.png` | 完全コピー | (6,2)〜(23,45) | `e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e` |

主人公は全4枚maxY=43、Canvas表示はcenter=14／foot=44固定。
セナは全4枚maxY=45、Canvas表示はcenter=15／foot=46固定。
全8枚は32×48、実透過あり、半透明0、画像端の不透明画素0。

## 3. 再現と検査

`tools/prepare-character-motion-v24.ts` が派生処理と検査仕様を持つ。

- `node --experimental-strip-types tools/prepare-character-motion-v24.ts --write`：未作成時だけ派生PNGを作る。既存ファイルは上書きしない。
- `npm run verify:character-motion-alignment`：各派生が指定原本の完全コピーまたはy=-1pxの整数移動と全画素で一致するか検査する。
- 移動で画素が画像外へ欠ける場合は失敗する。
- AABBの靴底、半透明0、画像端へ届く画素0を検査する。
- v23原本のハッシュは従来の `verify:character-art` が固定する。派生側だけを都合よく変えても検査を通らない。

## 4. セナの仮面と指輪

実装入口は `src/scenes/characterMotionPreview.ts`。本編ではなくDEV人物比較だけで使用する。

### 仮面

- 生成身体の顔位置を待機2／歩行4コマ別に指定する。
- 石灰色の面は5×7以内。髪、頭頂、顎、首、肩、衣服を覆わない。
- 細い暗色の目の穴と、右頬側の鈍い縁だけを置く。
- 仮面を外した時は同じ生成身体がそのまま見え、別人へ切り替わらない。

### 左手の指輪

- 身体PNGの反転処理には含めず、待機2／歩行4コマの左手外縁を別に持つ。
- 右向きは身体中心より右、左向きは身体中心より左へ明示配置する。
- 錆びた金属 `#8d7452` 1pxと、指輪の青緑 `#72d6c0` 1pxだけ。発光面、粒子、常時オーラは追加しない。
- 本工程では指輪を上げ下げする終戦用動作は扱わない。既存の `ringHandLower` と最終演出へ接続する時に別途検査する。

## 5. DEV比較と画面記録

人物比較でPを押すと主人公とセナの両方がPNG候補になる。MはPNG身体のまま仮面層だけを着脱する。
Vの「接地検査」では基準0＋候補1〜4を2倍表示し、主人公・セナとも全コマの靴底が基準線へ一致することを確認した。
左右キーで、仮面の向きと指輪の側が人物の向きに追随することを確認した。

| 画面記録 | 内容 | SHA-256 |
|---|---|---|
| `hero-sena-walk-aligned-v24.jpg` | 仮面なし、右向き、接地済み歩行、PNG候補v24 | `19861bf23fe1a9a143939149f88364bf9ca7901bbe92d7c4a60cf56de7c44fd1` |
| `sena-mask-ring-right-v24.jpg` | 仮面あり、右向き | `5eea541785949452a9cd9d6be573356f1b78917c9a0b6ae8b7ebf8e103e9cbff` |
| `sena-mask-ring-left-v24.jpg` | 仮面あり、左向き | `9df1ff2e404390c888a790462e276a6107f9e3afc91066056f00008b51162f0a` |
| `hero-sena-stop-recovery-v24.jpg` | 歩行4コマ目を経て待機へ戻った状態 | `d87538c5c45b8789b1bb81f2fe7cfd8f6717774d1c956b6ccc63a6b49c5fa50d` |

画面記録は1280×720のブラウザ表示をJPEGで保存した比較資料であり、ゲーム資産ではない。

## 6. 採否

### DEVで合格

- 生成原本を残した非破壊の接地派生。
- 人物別の歩行4コマで靴底差0px。
- 仮面着脱で身体同一性を維持。
- 左右向きで左手側の指輪を維持。
- ENTERで停止を予約し、歩行4コマ目を表示してから待機へ戻る。再度ENTERで歩行1コマ目から再開する。
- 新しいPixelLab生成・枠消費・契約変更なし。

### 本番採用前に残ること

1. 仮面を外す終戦演出の `ringHandLower` とPNG身体を一時接続し、左手が飛ばないことを確認する。
2. 村道エンディングの二人歩行へ一時接続し、背景・台詞・画面端との組合せを比較する。
3. ユーザーの実画面確認後、PNG採用かコード人物の継続採用を決める。
4. 採用時だけ `src/assets/series2/`、`series2Assets.ts`、`verify:assets`へ移す。現段階では `docs/concepts/`から本番bundleへ入れない。

## 7. 検証結果

2026-09-01に17項目を通過した。

- `npm run build`
- キャラ原本35枚、v24接地派生8枚、人物色、森原本、採用素材、森Scene
- 25画面・25戦、保存、導入戦、物語戦、台本、バランス、制作上限、正典、呪文分布
- 本番bundle検査：6ファイル。正式画像はv19森背景1点だけで、`docs/concepts/`、v24人物PNG、DEV比較Sceneは含まれない

ブラウザ1280×720でPNG候補v24を表示し、通常速度の歩行、左右、仮面着脱、主人公／セナの接地列、停止待ちから待機への復帰を確認した。
Windowsサンドボックス内でtsxの2検査だけ既知の `uv_os_get_passwd ENOMEM` になったため、通常権限で再実行して合格した。実装不良の失敗とは分けて記録する。
