# 主人公・セナのPNG動作試作 v23

> 2026-09-01  
> 状態：待機・歩行のPixelLab候補をDEV比較へ接続。本番未採用。  
> 主人公は短い歩幅案、セナは明確な歩幅案を比較中。仮面・左手・指輪は未接続。

## 1. 目的と境界

- 承認済みの茶髪主人公と、v22のセナ素顔・床なし原本から、待機と歩行を少数制作する。
- 上限は各人とも待機2・歩行4。右向き一系統を作り、通常身体の左向きは表示時反転で検査する。
- セナの仮面、左手の物語動作、指輪は生成身体へ焼き込まない。特殊層の左右は今回の通常反転の合格範囲外。
- 原本・入力を含む5枚を検査してから、待機2／歩行4だけをDEV再生する。本番Scene・保存・Manifestには接続しない。
- 既存のコード動作は本編の基準として維持し、生成結果が基準未達なら置換しない。

## 2. 生成条件と費用

- 生成元：PixelLab `animate_image`。32×48、透明背景、frame_count=4。返却は入力原本index 0＋生成index 1〜4の計5枚。
- 主人公2回＋再試行1回、セナ2回＋再試行1回、計6枠。
- 残り1989→1983、使用11→17／周期2000。Tier 1、credits $0.00、リセット2026-09-30。追加購入・契約変更なし。
- PixelLabの前日の一時URLは失効して404となった。保存済みの自作PNGをbase64で入力し直した。404の2回はjob作成前で消費なし。
- 入力は本作の自作生成原本のみ。他作品の画像・第三者画像は送信していない。
- 開始と終了を同じ原本で固定した回は、ループ終端を原姿勢へ寄せるための補間。入力画像の役割は編集・アニメーション対象。
- index 0は既存原本と同一なので重複保存しない。生成1〜4は全て別名で保存し、採用候補外も履歴として残す。
- ローカルでリサイズ、減色、トリミング、画素移動は行っていない。

## 3. 実送信プロンプトとjob

### 主人公・待機

- job：`0b89bd76-7042-449c-8295-911d0e4401fb`／seed：83301／1枠
- 入力：v20茶髪原本
- 出力：`https://api.pixellab.ai/mcp/images/0b89bd76-7042-449c-8295-911d0e4401fb/download?index=0...4`
- 判定：原本0と生成1を待機2候補。生成2〜4は頭頂差が大きく不使用。

```text
Subtle breathing idle loop. Keep both boots fully planted on the same baseline. Move shoulders and chest by only one pixel; let the moss scarf tip and small rear hair tuft sway by one pixel, then return. Hands stay relaxed and empty. No step, turn, gesture, prop, floor, shadow, effect or camera motion.
```

### 主人公・歩行初稿

- job：`b99c56a3-0791-47cb-bfa9-94121036bf42`／seed：83302／1枠
- 入力：v20茶髪原本
- 出力：`https://api.pixellab.ai/mcp/images/b99c56a3-0791-47cb-bfa9-94121036bf42/download?index=0...4`
- 判定：歩幅と上下動が大きく不採用。

```text
Compact side-view walk cycle toward the RIGHT. Alternate leading foot and trailing foot with natural opposite arm swing, one-pixel body bob, and clear heel/toe contact. Return to the starting rhythm for a seamless loop. Keep the satchel close to the hip. No turn, run, jump, attack, weapon, floor, shadow, effect or camera motion.
```

### 主人公・短い歩幅

- job：`322d7938-3bd8-4269-82cf-8b3b4d56ecd1`／seed：83303／1枠
- 入力：v20茶髪原本を開始・終了
- 出力：`https://api.pixellab.ai/mcp/images/322d7938-3bd8-4269-82cf-8b3b4d56ecd1/download?index=0...4`
- 判定：生成1〜4を歩行4候補。DEVのみ。

```text
Very restrained slow walking cycle toward the RIGHT, with short steps. At least one whole boot sole stays on the fixed baseline in EVERY frame; never lift both feet. Body and head vertical movement is at most ONE pixel. Alternate feet and small opposite arm swings, then return exactly to the starting stance. Calm village walk, not running or sneaking. No turn, jump, attack, prop, floor, shadow, effect or camera motion.
```

### セナ・待機

- job：`32c8cdd5-4e33-4862-89cd-22855d4e1179`／seed：83311／1枠
- 入力：v22素顔・床なし原本を開始・終了
- 出力：`https://api.pixellab.ai/mcp/images/32c8cdd5-4e33-4862-89cd-22855d4e1179/download?index=0...4`
- 判定：原本0と生成1を待機2候補。仮面・指輪なし。

```text
Very subtle calm breathing idle loop. Keep both boots fully planted on the same baseline. Move shoulders and chest by only one pixel; let the long dark hair move by at most one pixel, then return. Hands stay relaxed and empty. No step, turn, gesture, mask, ring, prop, floor, shadow, effect or camera motion.
```

### セナ・歩行初稿

- job：`24222334-3134-4012-b3df-e409edcaf78b`／seed：83312／1枠
- 入力：v22素顔・床なし原本を開始・終了
- 出力：`https://api.pixellab.ai/mcp/images/24222334-3134-4012-b3df-e409edcaf78b/download?index=0...4`
- 判定：足の動きが小さく待機寄り。不採用。

```text
Very restrained slow walking cycle toward the RIGHT, with short steps. At least one whole boot sole stays on the fixed baseline in EVERY frame; never lift both feet. Body and head vertical movement is at most ONE pixel. Alternate feet and small opposite arm swings; long hair moves at most one pixel. Calm quiet walk, not running or sneaking. No turn, mask, ring, weapon, floor, shadow, effect or camera motion.
```

### セナ・明確な歩幅

- job：`18f87b4e-c910-4ba4-bb18-b3cc121b9382`／seed：83313／1枠
- 入力：v22素顔・床なし原本を開始・終了
- 出力：`https://api.pixellab.ai/mcp/images/18f87b4e-c910-4ba4-bb18-b3cc121b9382/download?index=0...4`
- 判定：生成1〜4を比較候補。生成2のみ靴底が基準より1px上で、本番未採用。

```text
Clear calm four-phase walking cycle toward the RIGHT. Each stride moves a boot THREE TO FOUR pixels horizontally: contact, passing, opposite contact, return. In every frame one whole boot sole is planted on the same baseline; never lift both feet. Keep hips and head vertical movement within ONE pixel and long hair movement within ONE pixel. Small opposite arm swing. Natural quiet walking, not shuffling, running or sneaking. No turn, mask, ring, weapon, floor, shadow, effect or camera motion.
```

## 4. 原本検査

24枚すべて32×48、半透明0、画像端の不透明画素0。下表の範囲は生成原本のAABBであり、表示時の自動トリミングはしない。

| ファイル | bytes | AABB | 透明／不透明 | SHA-256 |
|---|---:|---|---:|---|
| hero-pixen-idle-v23-f1.png | 1469 | (5,2)〜(23,43) | 1050／486 | `148613d28583701db5eb63e6a924db85b1ced6b98f20b7ef73e2d37a089b2dd5` |
| hero-pixen-idle-v23-f2.png | 1464 | (5,4)〜(23,43) | 1055／481 | `74ab9c14360497f61d6a30a24d3ca812988c1aace47ffd8cf1f8930d0f9d7fea` |
| hero-pixen-idle-v23-f3.png | 1458 | (5,4)〜(24,43) | 1050／486 | `ea8f143367bb4ef8fa6295ede7cbc55656e6526b423764b99ce01760d5d0e2b9` |
| hero-pixen-idle-v23-f4.png | 1494 | (6,3)〜(23,43) | 1049／487 | `deb10dc9bcb95c9d15fe963e7356ed00f9fb1c518226dc5c0cdf5c8d2ec44cd9` |
| hero-pixen-walk-short-v23-f1.png | 1565 | (5,2)〜(22,44) | 1035／501 | `a82004eb2f999bd43026a9e44997391d2fc4a2532bb178d65eb9f73f9bda9117` |
| hero-pixen-walk-short-v23-f2.png | 1579 | (5,3)〜(25,44) | 1024／512 | `b8965952daddc4967cfdedec01cbbd127c597c8f242ac38f6da307c674040a9d` |
| hero-pixen-walk-short-v23-f3.png | 1597 | (6,2)〜(22,44) | 1034／502 | `2bc147462136c3b2f3dae070d03df151637b1e828d9a09e3115d203bad75f145` |
| hero-pixen-walk-short-v23-f4.png | 1499 | (5,2)〜(22,43) | 1060／476 | `1527cdc1af3b72d920763da4d062e5f57b68eb1423eae2bb8c55f736360c5ea5` |
| hero-pixen-walk-v23-f1.png | 1514 | (5,3)〜(22,44) | 1044／492 | `2d52e8a84eb0839108bb553f59ad46878bb2d3e7509d39c2cc91eebe0f6088ca` |
| hero-pixen-walk-v23-f2.png | 1436 | (5,4)〜(23,44) | 1060／476 | `00e03633df388acb74cb161a62988c082802f11b9822fda086b9532ce3cb6d83` |
| hero-pixen-walk-v23-f3.png | 1488 | (6,2)〜(23,43) | 1047／489 | `b6d1a33bf66cfa5f0e24791190895ee8a8e76169e9c533bfae4ca0b855083c2c` |
| hero-pixen-walk-v23-f4.png | 1443 | (6,3)〜(23,44) | 1039／497 | `21e130f8688acc7076904d15e7c9e607e11135c50be2f0490309b89eb0883214` |
| sena-pixen-idle-v23-f1.png | 1361 | (5,3)〜(23,45) | 970／566 | `e3ebc172d2e9e5f0955fd31506adfe5c29216342cc90f0ae80ffd655bf587b7b` |
| sena-pixen-idle-v23-f2.png | 1358 | (6,3)〜(24,45) | 963／573 | `f7af19815e9083d5df967aa5aef18ba8a5416fedeb1a1ee4c669ca93ef61d309` |
| sena-pixen-idle-v23-f3.png | 1402 | (6,3)〜(23,45) | 978／558 | `3a4eadd72665d526f444c6c5a640f8d2f6cf1a005a91af7416204c71ce64177e` |
| sena-pixen-idle-v23-f4.png | 1338 | (6,2)〜(23,45) | 985／551 | `e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e` |
| sena-pixen-walk-clear-v23-f1.png | 1368 | (6,2)〜(24,45) | 989／547 | `606a36f50446a9a21746fb035ae9eddd0190c7e6c71eeb906a4e44691481ff52` |
| sena-pixen-walk-clear-v23-f2.png | 1433 | (6,3)〜(26,44) | 962／574 | `a68f2c2e74609f763e34c6be94c626cb9296ad542e803bae5bac5939679a8fe9` |
| sena-pixen-walk-clear-v23-f3.png | 1403 | (7,3)〜(24,45) | 1005／531 | `42fa9a1fa79a7913b0fd6762f8ea42c90d8bfc886c9f50388f4c3640a7ec87bf` |
| sena-pixen-walk-clear-v23-f4.png | 1338 | (6,2)〜(23,45) | 985／551 | `e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e` |
| sena-pixen-walk-v23-f1.png | 1371 | (6,3)〜(24,45) | 983／553 | `650a84dd8a51ba2225418f56049b15987538659a41c7c68e94626b2c421e49a9` |
| sena-pixen-walk-v23-f2.png | 1324 | (7,3)〜(25,45) | 979／557 | `12168b01b1f3ea1f17a5cbfaee9fce6369c5c27cc544519747c17fc9ec34eff3` |
| sena-pixen-walk-v23-f3.png | 1357 | (7,3)〜(23,45) | 1003／533 | `0d831246a0af07dd07275f7764e720058ab799b40fc056c9b46fe950de88d985` |
| sena-pixen-walk-v23-f4.png | 1338 | (6,2)〜(23,45) | 985／551 | `e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e` |

## 5. 採否と接地

### 主人公

- 待機：入力原本0と生成1を2コマ候補にする。両方とも頭頂2、靴底43で、同じCanvas位置。胸・腕・髪の小さな差だけを使う。
- 待機の生成2〜4は頭頂が2px変わるものがあり、2コマ候補へ入れない。
- 歩行初稿は大股で走り寄り。比較画像を残すが再生候補には使わない。
- 短い歩幅の生成1〜4は、頭頂2/3/2/2、靴底44/44/44/43。上下差は1pxだが、原本foot=44に対し最初の3枚が靴底を1px多く使う。DEV候補であり、同一靴底の本番素材としてはまだ採用しない。
- 茶髪、苔色の襟巻き、生成りの服、鞄、膝の補修は全候補で読み取れる。

### セナ

- 待機：入力原本0と生成1を2コマ候補にする。靴底45を共有し、頭頂は2→3の1px差。長髪・上衣の小さな差だけを使う。
- 歩行初稿は靴底45を共有するが、足の変化が小さく歩行として弱いため不採用。
- 明確な歩幅の生成1〜4は歩行として読める。頭頂2/3/3/2。靴底は45/44/45/45で、生成2だけ1px高い。
- 生成2の接地差を、表示時の自動トリミングや位置補正で隠さない。RAWはfoot=46固定で表示し、本番採用前の修正点として残す。
- 黒緑の長髪、青緑の上衣、茶の帯と靴は維持。仮面・指輪・武器・床の混入はない。

## 6. DEV比較

入口：ためす（開発）→人物 歩行比較。

- P：コード基準／PNG候補。PNG時は主人公を生成候補へ変更し、Mで素顔にした時だけセナもPNG候補にする。仮面時はコード版を維持。
- ENTER：待機2／歩行4。約6コマ／秒は既存コード基準と同じ。
- V：現在の人物・動作のRAW5枚。N：主人公／セナ。入力0と生成1〜4を2倍で並べる。
- 左右：通常身体の反転。G：v22静止画比較。Tab：主役／NPC／肖像。保存や物語進行は変更しない。
- RAWは主人公center14・foot44、セナcenter15・foot46を全コマ固定。位置ずれを隠さない。
- 通常比較の表示も原本Canvas基準。画面上の「PNG候補」「本番未採用」を採用済みの意味に読み替えない。

## 7. 画面記録

- `hero-walk-initial-raw-v23.png`：主人公の大股な不採用初稿。
- `hero-walk-short-raw-v23.png`：主人公の短い歩幅の再試行。
- `sena-walk-raw-v23.png`：セナの動きが小さすぎる不採用初稿。
- `sena-walk-clear-raw-v23.png`：セナの明確な歩幅。生成2の靴底1px差もそのまま表示。
- `sena-idle-raw-v23.png`：セナの待機入力＋生成4枚。
- `hero-sena-idle-png-v23.png`：通常寸法・同じ足元のPNG待機。
- `hero-sena-walk-png-v23.png`：通常寸法・右向き・約6コマ／秒のPNG歩行。
- `hero-sena-walk-left-png-v23.png`：通常身体の左反転。指輪層の検証ではない。
- `hero-sena-motion-final-v23.png`：右向き歩行、PNG候補表示、Canvas 960×540。最終のユーザー確認用。
- 1280×720 viewport、Canvas表示960×540。最終タブの警告・エラーログ0件。

## 8. 検証

- キャラ原本35枚（既存11＋v23生成24）のハッシュ、32×48／80×64寸法、透過、半透明0、画像端を検査。
- 主人公の子供・成人、待機2／歩行4、左右、肖像を茶髪で維持し、他人物へ混入しないことを検査。
- 森素材、採用素材、森本編、パネル、保存、導入戦、物語戦、台本、バランス、制作上限、正典、分布、build、bundleを含む16項目を通過。
- 本番bundleは6ファイル、JS228.41kB／gzip74.78kB。本番画像はv19背景1点。v23人物PNGとDEV比較Sceneは含まれない。
- `git diff --check`の内容エラーなしを最終確認する。既存ファイルのLF→CRLF予告は変更内容のエラーとして数えない。
- 全編の通常導線による手動通しは未完了。今回のDEV比較や自動検証で代替しない。

## 9. 本番採用前の残件

1. 主人公の短い歩行3枚と、セナの明確な歩行1枚の靴底位置を、原本を保った方法で一致させる。表示側で自動補正して合格にしない。
2. 修正後に頭頂差1px以内、靴底差0px、4コマの左右・通常速度・停止復帰を再確認する。
3. セナの仮面を顔の別層、左手と指輪を非反転の別層として接続する。生成身体の反転だけで正典合格にしない。
4. 完了後に本番Manifestへ採用するか、コード人物を完成版として維持するかをカテゴリ単位で決める。
5. 他NPCや他地域の大量生成は、この人物カテゴリの方式確定後に行う。

## 10. 次の再開地点

- 現時点ではPNG待機と歩行をDEV候補として比較できる。
- 次は接地差を修正する方式を決める。高額なinpaintは32×48の1px修正に20〜40枠必要なため自動実行しない。
- 接地が揃った後、仮面・左手・指輪の別層と停止復帰へ進む。
- 本編、保存、戦闘、単一ED、コード人物の動作は今回変更していない。
