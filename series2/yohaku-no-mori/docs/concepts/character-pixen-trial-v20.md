# 主人公・白樹の獣：PixelLab静止画試作 v20

> 生成・確認日：2026-08-31  
> 状態：修正版2点をDEVで比較済み／ユーザーの方向確認待ち／本番未採用

## 1. 今回の到達点

採用済みの森入口を比較基準に、成人主人公と白樹の獣を各1枚生成し、各1回修正した。
生成原本4枚を残したまま、修正版だけをDEVの比較画面で表示する。
本番画像目録はv19の背景1点から変更していない。主人公の歩行、獣の警戒・道を譲る姿は本編では従来のコード描画を維持する。

- 主人公：苔色の襟巻き、生成りの服、小さな鞄、膝の補修を確認できる。
- 白樹の獣：白い樹皮、枝角、苔色の横長の四足体型を確認できる。
- 初回の主人公には台座、獣には輪郭外の格子状模様が混入。透過があっても完成合格にはしなかった。
- 修正版では台座・格子模様がなくなった。半透明の縁もない。
- 主人公は原型より細身でやや少年寄りに見える。成人の体格・頭身の判定は残す。
- 獣は原型より枝角が細かく、鹿の印象が強い。警戒姿勢の印象と道を譲る差分の同一性は次の判定とする。
- 待機・歩行・セナ・道を譲る姿は未生成。大量生成や本番置換には進んでいない。

## 2. 生成方式・参照・利用枠

- 生成元：PixelLab Pixen（`create_image_pixen` / `edit_image_pixen`）。背景で使ったProとは別。
- 新規生成：右向き、side view、selective outline、low detail、no_background=true。
- 原本寸法：主人公32×48、獣80×64。小さな表示用ドットの密度を先に試す。
- 新規生成には参照画像を送信していない。自作コード原型、アートバイブル、既存概念画を確認し、衣装・体型を文章で指定した。概念画をモデルの画像入力として使用したという意味ではない。
- 修正時の入力は今回生成した各原本のPixelLab URL。参照の役割は「編集対象」。
- 他作品の画像や第三者のキャラクターを入力していない。
- 新規2回＋修正2回、計4枠。今回の開始時点は残り2000／使用0、完了後は残り1996／使用4。取得した次回リセット日は2026-09-30。
- 前回の残り1038から今回は集計周期が変わっている。過去の残高との差を今回の消費として計算しない。
- 契約変更・追加購入なし。v18で失敗したTier 2必須の`inpaint_image`は再送していない。今回のPixen編集は別の利用可能な機能である。

## 3. 原本と判定

保存先はすべて `docs/concepts/`。ダウンロードしたPNGをそのまま保存し、上書き・色数削減・ローカル画像修正はしていない。

| ファイル | 寸法 | bytes | seed | 判定 |
|---|---|---:|---:|---|
| hero-pixen-v20.png | 32×48 | 1391 | 83201 | 不採用：足元の台座 |
| boundary-beast-pixen-v20.png | 80×64 | 4848 | 83200 | 不採用：輪郭外の格子模様 |
| hero-pixen-clean-v20.png | 32×48 | 1487 | 83202 | 比較候補：成人の体格は未確定 |
| boundary-beast-pixen-clean-v20.png | 80×64 | 4478 | 83203 | 比較候補：非殺傷姿勢は未生成 |

### job ID・取得元

- 主人公初回：`18dfce9d-cbc9-4eec-b493-98be09dfe0bb`  
  https://api.pixellab.ai/mcp/images/18dfce9d-cbc9-4eec-b493-98be09dfe0bb/download
- 獣初回：`2ef3d5bc-377c-4ee8-a3f3-e20bed42eb44`  
  https://api.pixellab.ai/mcp/images/2ef3d5bc-377c-4ee8-a3f3-e20bed42eb44/download
- 主人公修正：`7eb7cb97-e797-4f73-bd5a-ac3d3b75a9b3`  
  https://api.pixellab.ai/mcp/images/7eb7cb97-e797-4f73-bd5a-ac3d3b75a9b3/download
- 獣修正：`c3caf8d2-6a3f-438c-ad86-8408e0868b82`  
  https://api.pixellab.ai/mcp/images/c3caf8d2-6a3f-438c-ad86-8408e0868b82/download

### SHA-256

```text
hero-pixen-v20.png
b2c1d944382596247453721c1a8832c4e822cf32aa1fe721076ac0b13a9eda62
boundary-beast-pixen-v20.png
76a1bd47844d48643973c21208e9c15a9d994e6b7c5de4d934d4fc7cbf8def26
hero-pixen-clean-v20.png
61b6664dd8f0b156f3ed2feadd2dd36ce753d0e85b1696ecedd89483771007e0
boundary-beast-pixen-clean-v20.png
a5d43fe3436526000e4b769e8f7f05a8e68c61e3f0b22bed224061e6f0a4b8ee
```

### 画素検査

座標は原本左上が(0,0)、右端・下端を含む範囲。

| 原本 | 不透明の範囲 | 透明 | 不透明 | 半透明 | 画像端の不透明画素 |
|---|---|---:|---:|---:|---:|
| 主人公初回 | (0,2)〜(31,47) | 910 | 626 | 0 | 40 |
| 獣初回 | (4,1)〜(77,60) | 2803 | 2317 | 0 | 0 |
| 主人公修正 | (5,2)〜(22,43) | 1060 | 476 | 0 | 0 |
| 獣修正 | (4,1)〜(74,60) | 3055 | 2065 | 0 | 0 |

修正後の本体範囲は主人公18×42、獣71×60。
初回の獣も画像端の画素は0だったが格子模様は混入していた。「透過あり」「画像端が空いている」だけでは品質判定にならない。

### 修正の注意

修正プロンプトは余計な部分の除去と本体維持を求めたが、出力は本体の色も再描画されている。
厳密なアルファマスク編集・同一画素の維持ではない。

- 主人公：初回から不透明150画素が透明化、追加0。重なる不透明画素のRGBは462画素が変化し、14画素だけ一致。
- 獣：不透明255画素が透明化、追加3。重なる不透明画素のRGBは2062画素が変化。
- 顔・衣装・体型・向きが引き継がれて見えることと、元のピクセルが不変であることを区別する。修正前後を別ファイルで残す。

## 4. 実送信プロンプト

### 成人主人公・新規（seed 83201）

```text
One single full-body sprite of a kind young adult male villager, standing neutrally and facing RIGHT in a strict side view, for a colorful 2D side-scrolling RPG. Tiny readable pixel art on a 32x48 transparent canvas. About 4.5 heads tall, small adult head, single-pixel eye, compact chestnut-brown hair with one small swept-back tuft. Short moss-green scarf with just one small tail, warm undyed linen short tunic, dark desaturated green trousers, one large ochre repair patch on the visible right knee, plain brown boots. A small worn brown shoulder satchel hangs behind his hip with a simple diagonal strap across his chest. Arms relaxed, empty hands, two feet resting on the same horizontal baseline. Warm tan skin, gentle understated expression. Large clean clusters, selective dark-green/brown outline, flat color planes and at most a few shade steps. Quiet light from above. The whole figure including hair and soles stays inside the canvas with a small transparent margin. No hat, hood, cape, armor, weapon, staff, jewelry, gloves, oversized eyes, giant head, chibi proportions, ornate detail, dithering, smooth gradients, ground shadow, floor, scenery, checkerboard pattern, text, UI, sheet or multiple poses.
```

### 白樹の獣・新規（seed 83200）

```text
One single full-body forest guardian beast, standing alert facing RIGHT in strict side profile, a game sprite for a colorful 2D side-scrolling RPG. 80x64 canvas, real transparent background. A broad low horizontal quadruped with a sturdy hound-bear body, four short weight-bearing legs and flat feet, short tail to the left, head to the right. Its back, thick neck and forehead carry pale ivory-white BIRCH BARK plates with only a few dark bark marks; muted sage green underneath and sparse moss on the shoulders. Two small asymmetric branching WHITE WOOD antlers rise above the head, clear stepped branches with blunt tips. Tiny calm turquoise eye. This creature blocks a forest path and pushes intruders back, not a predator trying to eat them. Alert but not attacking, mouth closed, no exposed teeth. Clean silhouette, broad pixel clusters, at most five shade steps, selective dark moss outline, subtle warm top light. Entire body and antlers inside canvas, body approximately 68 pixels wide, total height approximately 58 pixels, feet aligned near the bottom. No long deer legs, humanoid body, wings, weapons, armor, saddle, rider, red eyes, spikes, blood, glow aura, floor, cast shadow, scenery, text, checkerboard pattern, blur or multiple poses.
```

### 主人公の台座除去（seed 83202）

編集対象：主人公初回の取得元URL。32×48、no_background=true。

```text
Remove the entire horizontal platform, floor stripes and cast shadow below the boots. Replace them with fully transparent pixels. Keep the character's face, hair, green scarf, linen tunic, satchel, knee patch, boots, side-view pose, colors and pixel positions unchanged. This is a freestanding character sprite, not standing on any depicted object. No floor, platform, shadow, border or checkerboard. Transparent canvas outside the person.
```

### 獣の輪郭外模様除去（seed 83203）

編集対象：獣初回の取得元URL。80×64、no_background=true。

```text
Remove every checkerboard/dither halo and loose noise pixel outside the beast, especially around the antlers and above the back. Make those areas fully transparent, not dark squares. Preserve the full silhouette, antlers, face, white bark, green body, pose and size. Keep only a clean one-pixel selective outline touching the actual body and antlers. Do not add any aura, shadow, floor, scenery or pattern. Transparent background.
```

## 5. DEV比較と寸法

入口：タイトル → ためす（開発） → 人物 歩行比較 → `G`。

| 操作 | 内容 |
|---|---|
| 1 / 2 / 3、Tab | 森／拡大検査／戦闘配置 |
| ← / → | 全候補の左／右向き |
| U | 森で会話窓を表示・非表示 |
| G | 戦闘配置で原型・生成を切替 |
| Escape | 人物歩行比較へ戻る |

- 森では原本1pxを設計1pxとして表示。内部960×540のCanvasでは整数2倍になる。元PNG自体の拡大は行っていない。
- 主人公の描画原点はcenter=14、foot=44。獣はcenter=39、foot=61。足元176へそろえる。半画素移動や非整数リサイズで原型へ合わせない。
- 左向きは描画時の反転。右膝の補修等も反転する通常人物の規則に従う。セナの左手・指輪にはこの判定を流用しない。
- 足元の影はコードで独立描画し、PNGには含めない。拡大検査では影を出さない。
- 拡大検査の主人公3倍・獣2倍は検査用であり、実プレイ時の大きさではない。
- 正式規格の成人64×96、敵170×170以内は変更しない。今回の原本を将来整数2倍化すると64×96／160×128に収まるが、正式ファイルやManifest登録はまだ作成していない。
- 戦闘配置は既存の背景・ゲージ・HUD部品を使用した**静止画の比較画面**。実際のBattleSceneの進行・呪文入力・勝利演出を検証するものではない。
- 比較Sceneは独立したPlayerを持ち、ユーザーの保存・進行へ接続しない。読み込み待ち・寸法不正を明示し、生成成功を原型で偽装しない。
- DEV入口・文字列・PNGは本番bundleから除外する。

## 6. 画面記録と検証

### 画面記録

- `character-pixen-initial-inspection-v20.png`：初回不具合の記録。最終候補として提示しない。
- `character-pixen-clean-inspection-v20.png`：修正後。明暗の単色面で輪郭を検査。
- `character-pixen-forest-v20.png`：採用背景上で原型と生成候補を同じ足元に配置。
- `character-pixen-forest-dialogue-left-v20.png`：左右反転と会話窓。
- `character-pixen-small-dialogue-v20.png`：640×480 viewport、ゲーム表示480×270の可読性。
- `character-pixen-battle-v20.png`：既存部品による戦闘配置比較。

全てブラウザのスクリーンショットであり、余白やUIを含む比較資料。生成モデルの原本や本番素材ではない。

### 確認内容

- 960×540表示と480×270表示、森・会話窓・戦闘配置、左／右向き。
- 主人公の足元に台座がなく、獣の枝角・背中の周囲に格子模様がないこと。
- 両者の足が会話窓の上に残り、枝角が敵名・警戒ゲージへ重ならないこと。
- 比較画面の切替・戻る操作。静止画だけの確認なので、移動アニメの滑り・継ぎ目は未検査。
- `verify:character-art`を新設し、原本ハッシュ・寸法・透明／不透明・半透明0・修正版の画像端を検査する。
- `verify:bundle`にキャラ試作・比較資料の混入検査を追加した。
- 自動検証とbuildの計15項目を通過：`verify:character-art`、`verify:forest-art`、`verify:assets`、`verify:forest-scene`、`verify:panels`、`verify:save`、`verify:intro-battle`、`verify:story-battles`、`lint:series2`、`balance:series2`、`verify:scope`、`verify:canon`、`verify:dist`、`build`、`verify:bundle`。
- `verify:forest-scene`の初回はサンドボックス内でtsxのWindowsユーザー情報取得が失敗した（`uv_os_get_passwd`）。通常権限で再実行して通過。アプリ側のテスト失敗とは区別する。
- 本番出力6ファイル、JS 228.30kB／gzip 74.69kB。キャラ候補・DEV比較画面は配布されず、採用背景1点を維持した。
- ブラウザの警告・エラーログ0件。Gの原型切替とEscapeによる人物比較への復帰を確認。`git diff --check`通過（既存の改行変換予告のみ）。全編手動通しの代替ではない。

## 7. 次に行うこと

1. この代表比較をユーザーへ提示し、質感・体型の方向を確認する。
2. 主人公を成人らしい体格へ整えるか判断する。現在の候補を縦横へ引き伸ばして解決しない。
3. 獣の「道を譲る」静止姿勢を用意し、警戒姿勢と同一個体に見えるか確認する。
4. セナの静止画を同じ密度へ合わせる。左手と指輪の正典は別に検査する。
5. 静止画承認後、少数の待機・歩行コマを生成／調整してから本番採用を判断する。

## 8. 利用条件の確認

生成時の2026-08-31に、[PixelLab利用規約](https://www.pixellab.ai/termsofservice)（表示更新日2025-11-23）と[公式FAQ](https://www.pixellab.ai/docs/faq)を確認した。
商用・非商用利用、改変、配布に関する1.3・3.3の許可と、学習用途等の制限を適用する。
規約が参照するRAILの条件は `第三者ライセンス.md` とv17記録を参照。
これは排他的な著作権や第三者権利非侵害の保証ではない。今回は開発資料として保存し、ゲーム配布物には含めない。
機能の一次資料：[PixelLab API](https://api.pixellab.ai/v2/docs)。実際の入力・出力・消費は今回のツール応答と上記原本を根拠とする。
