# 茶髪復元・セナと獣の姿勢試作 v22

> 2026-08-31  
> 主人公：ユーザー指定でv20茶髪へ復元。セナ：素顔・仮面の静止画候補、ユーザー承認待ち。  
> 獣の姿勢2案：不合格。本番画像は森入口の背景1点のまま。

## 1. 今回の決定

- ユーザーは水色より元の配色を選んだ。主人公は `hero-pixen-clean-v20.png` をそのまま制作基準へ戻す。茶色へ再生成・再着色したものではない。
- 茶髪、苔色の襟巻き、生成りの服、茶の鞄、膝の補修を維持する。体格・衣装の再設計はしない。
- 子供・成人・肖像のコード色も元へ復元した。共通定数 `HERO_HAIR` は保持し、子供の単色は従来の #3c3026 を使う。成人は #2a241f／#4b3529／#765039、肖像は従来の5色・元の矩形配置へ戻した。
- 水色PNGとv21記録は不採用の履歴として保存。現在の設計書・手順書・アートバイブル・資産台帳は茶髪を正とする。
- セナは同年代の男性。黒緑の長髪・細い青緑の上衣・茶色の帯と靴。素顔と白い仮面で、同じ髪・肩・服の形を起点とする。
- 指輪、左利きの特別な動作、正確な文字は別層。今回のPNGには指輪を入れず、別層の実装接続もまだ行っていない。通常の身体反転を、左手の物語演出まで検証済みとは扱わない。

## 2. 生成条件と費用

- 生成元：PixelLab、モデル：Pixen。新規1回、編集5回、計6枠。
- 残り1995→1989、使用5→11／周期2000。Tier 1、credits $0.00、リセット2026-09-30。追加購入・プラン変更なし。
- セナの新規生成は文章のみ。既存コード絵や他作品の画像は送信していない。side／east／low detail／selective outline／透明背景、32×48。
- 編集の画像入力は下記の自作原本のみ。画像の役割は編集対象。no_background=true、セナ32×48、獣80×64。
- プロンプト500文字制限による入力拒否が2回あった。jobは生成されず、修正して送信した。下記は実際に受理された文面のみ。
- 原本は別名で保存し、ローカルの描き直し、減色、リサイズ、透過加工は施していない。表示時の整数倍率・位置合わせのみ。
- 同日確認済みの利用条件は `../第三者ライセンス.md` とv20の記録を継承。キャラクターPNGを本番へ配布した状態ではない。

## 3. 原本と実送信プロンプト

### セナ初稿

- ファイル：`sena-pixen-unmasked-v22.png`
- ツール：`create_image_pixen`／seed：83220
- job：`d518404e-f2ea-4e7e-84ec-f0da1fdee2f5`
- 入力：自作設定の文章のみ
- 出力：[PixelLab原本](https://api.pixellab.ai/mcp/images/d518404e-f2ea-4e7e-84ec-f0da1fdee2f5/download)
- 判定：小物と袖の金属風の帯が混入。不採用。

```text
One full-body sprite of a quiet young adult MAN, same age as a young male villager, standing neutrally facing RIGHT in strict side profile for a colorful 2D side-scrolling RPG. Small 32x48 transparent canvas. Slim adult male proportions, about 4.5 heads tall, compact head, one-pixel eye, warm tan skin, calm reserved face, no beard. Long dark black-green hair in two broad flat clusters reaching to mid-back, unobstructed face. Narrow muted teal-green tunic ending above the knees with short side slits, plain dark green trousers, brown flat boots, small brown waist belt. No cape. Arms relaxed with small bare hands held beside the hips, EMPTY hands; jewelry and story objects will be a separate game layer. Feet flat on the same horizontal baseline near row 43, head near row 2. Keep entire hair, body and soles inside the frame with clear transparent margins. Warm subdued color, selective dark green outline, clean broad pixel clusters, low detail, flat planes and few shade steps, slight overhead light. No mask, hood, helmet, armor, shoulder pads, staff, sword, satchel, scarf, ring, bracelet, necklace, glowing eyes, aura, female bust, long skirt, huge anime eyes, chibi head, gradients, dithering, floor, platform, cast shadow, scenery, checkerboard, text or multiple poses.
```

### 獣の姿勢・初稿

- ファイル：`boundary-beast-pixen-yield-v22.png`
- ツール：`edit_image_pixen`／seed：83221
- job：`9a63aeb1-c753-4a3e-8cbf-9304346f2132`
- 入力：v20修正版 c3caf8d2-6a3f-438c-ad86-8408e0868b82
- 出力：[PixelLab原本](https://api.pixellab.ai/mcp/images/9a63aeb1-c753-4a3e-8cbf-9304346f2132/download)
- 判定：首は下がるが前脚が立ったまま。不合格。

```text
Pose edit: this same guardian calmly yields the path. Fold front legs onto the ground; lower chest, neck and antlers in a respectful bow. Hindquarters stay raised, rear paws planted. Head faces RIGHT, eye open, mouth closed. Preserve the broad body, green moss, white birch plates, branching antler shape, scale and foot baseline. Alive and unhurt, not asleep or dead, not lying on its side. No floor, shadow, halo, new objects or checkerboard. Transparent background.
```

### セナ・小物除去

- ファイル：`sena-pixen-clean-v22.png`
- ツール：`edit_image_pixen`／seed：83222
- job：`2bf1a172-a12e-4fee-b8d6-bc0f20e07fe5`
- 入力：セナ初稿 d518404e-f2ea-4e7e-84ec-f0da1fdee2f5
- 出力：[PixelLab原本](https://api.pixellab.ai/mcp/images/2bf1a172-a12e-4fee-b8d6-bc0f20e07fe5/download)
- 判定：小物・金属風の帯を除去したが、灰色の床が混入。不採用。

```text
Remove the brown dangling object behind his hip/hand completely. His hands are empty. Remove pale metallic bands from the near sleeve; make it plain teal cloth, not armor or a bracelet. Preserve this SAME young man's face, long dark-green hair, slim build, tunic, belt, trousers, boots, right-facing idle pose, exact size and ground position. No new objects, jewelry, ring, weapons, glow, floor, shadow or checkerboard. Keep background transparent.
```

### 獣の姿勢・再試行

- ファイル：`boundary-beast-pixen-kneel-v22.png`
- ツール：`edit_image_pixen`／seed：83223
- job：`93bcd5c6-fd68-4794-8b0e-c02910c11e51`
- 入力：獣の初稿 9a63aeb1-c753-4a3e-8cbf-9304346f2132
- 出力：[PixelLab原本](https://api.pixellab.ai/mcp/images/93bcd5c6-fd68-4794-8b0e-c02910c11e51/download)
- 判定：前脚を折る要件は依然未達。不合格としてDEVに明示。

```text
Change the front legs to a clear KNEELING BOW, not standing: BOTH front elbows touch the ground, forearms lie horizontally forward, chest only a few pixels above ground. Lower head and antlers with the chest. KEEP hind legs standing and rump high, paws planted. Same animal, scale, green body and white bark, tail, right-facing, eyes open, mouth closed. Calmly making room, not attacking, wounded, dead or lying sideways. No floor, shadow, objects or checkerboard; transparent background.
```

### セナ・仮面

- ファイル：`sena-pixen-masked-v22.png`
- ツール：`edit_image_pixen`／seed：83224
- job：`19881881-0374-4d38-91ef-575aa8edf1c4`
- 入力：セナ小物除去版 2bf1a172-a12e-4fee-b8d6-bc0f20e07fe5
- 出力：[PixelLab原本](https://api.pixellab.ai/mcp/images/19881881-0374-4d38-91ef-575aa8edf1c4/download)
- 判定：白い仮面の静止画候補。床なし。DEV比較のみ、ユーザー承認待ち。

```text
Add a plain matte ivory WHITE MASK over his face, forehead to chin, with one narrow dark eye slit. Keep long dark-green hair exposed: no white hood or helmet. Same young man, same head size, neck, slim build, plain teal tunic, empty hands, belt, trousers, boots, RIGHT-facing pose and pixel style. Change only the face covering. No cape, armor, horns, decorations, ring, jewelry, weapon, glow, floor or shadow. Preserve canvas size, foot placement and transparent background.
```

### セナ・床除去

- ファイル：`sena-pixen-groundless-v22.png`
- ツール：`edit_image_pixen`／seed：83225
- job：`efb8fa6c-6a88-4464-a205-8162dac7c582`
- 入力：セナ小物除去版 2bf1a172-a12e-4fee-b8d6-bc0f20e07fe5
- 出力：[PixelLab原本](https://api.pixellab.ai/mcp/images/efb8fa6c-6a88-4464-a205-8162dac7c582/download)
- 判定：現在の素顔の静止画候補。DEV比較のみ、ユーザー承認待ち。

```text
Remove ONLY the gray oval / gray floor pixels around and under his boots. Those pixels must become fully transparent. No ground or cast shadow is baked into this sprite. Keep both brown boots intact and preserve the face, long hair, teal clothes, hands, pose, placement and all other pixels. Do not add or redesign anything. Transparent background.
```

## 4. 数値検査

すべて半透明0、画像端の不透明画素0。透明背景でも床や小物が混入し得るため、数値だけで合格にしない。

| ファイル | 寸法／bytes | 不透明範囲 | 透明／不透明 |
|---|---|---|---|
| sena-pixen-unmasked-v22.png | 32×48／1286 | (6,2)〜(23,45) | 956／580 |
| boundary-beast-pixen-yield-v22.png | 80×64／4181 | (4,10)〜(74,59) | 3256／1864 |
| sena-pixen-clean-v22.png | 32×48／1444 | (6,2)〜(25,46) | 957／579 |
| boundary-beast-pixen-kneel-v22.png | 80×64／4173 | (4,9)〜(74,58) | 3248／1872 |
| sena-pixen-masked-v22.png | 32×48／1097 | (6,2)〜(23,45) | 980／556 |
| sena-pixen-groundless-v22.png | 32×48／1338 | (6,2)〜(23,45) | 985／551 |

SHA-256：

- `sena-pixen-unmasked-v22.png`：`196518714b59437a78d7770e68e54920ca5d4c646433d4dbcabc52c85800b42b`
- `boundary-beast-pixen-yield-v22.png`：`1513ce84c081e32607ca5bfed38c0fd1997dd1d47689524b174dfeeab5430a45`
- `sena-pixen-clean-v22.png`：`117cc3f7fd1b03fd4b85b872a9dae61957a01339aa84692b12b41daefb6d8fb6`
- `boundary-beast-pixen-kneel-v22.png`：`b3006c23589d5d4e9b4f34ffa17272457e8b1398c53c542ff6b4103cd5dd28f9`
- `sena-pixen-masked-v22.png`：`86e66581c7ebfb5278a1090554fc7029ec344f8f15ab4d973be3822a8dcf2844`
- `sena-pixen-groundless-v22.png`：`e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e`

### 静止画比較のアンカー

- 主人公：center14／foot44。元のv20原本・同じ基準。
- セナの現在の素顔と仮面：center15／foot46。両方とも不透明範囲18×44で同じ頭頂・靴底範囲。主人公18×42より頭頂が設計2px高い。
- 不採用のセナ小物除去版は床を含むためfoot47。現在の比較には使わない。
- 獣のv20警戒：center39／foot61。v22再試行：center39／foot59。接地比較のため2px位置補正する。
- 原本1px＝設計1px、人物32×48→正式寸法64×96相当。検査画面は人物3倍・獣2倍。大きさ合わせの縮小はしない。
- Pixen編集は画素固定の色置換・マスク編集ではない。顔、服、靴、輪郭も再描画される。素顔／仮面が同じ範囲になっていても、顔以外の全画素が不変とは扱わない。

## 5. 目視判定

### セナ：静止画候補

- 主人公の素朴な暖色と、セナの青緑・黒緑が分かれる。体型・頭の大きさは同じ作品の人物として比較可能。
- 初稿の意図しない茶色の小物と金属風の袖帯を除去。その編集で増えた灰色の床を追加編集で除去した。
- 現在の素顔／仮面に台座や灰色の楕円は見られない。仮面は顔だけを覆い、髪と衣装を露出させる。
- 仮面は鼻先・顎の見え方を変えるため、表情差分としての最終採用と動作への接続はこれから。同じ姿勢の候補2枚であり、PNGアニメの完成ではない。
- 本編では既存のコード人物・肖像を維持する。

### 白樹の獣：2案とも不合格

- 両案とも首と枝角は下がったが、前脚が立ったままで「前脚を折り、胸を低くして道を譲る」が読めない。
- 2回目はさらに明確な姿勢指示を与えたが、大きなポーズ変更を得られなかった。同じ文面の再送を続けず、今回の試行をここで区切った。
- `kneel` は依頼意図を示すファイル名であって合格判定ではない。
- 生きたまま道を譲る既存コード演出を維持。PNGの低い頭だけを勝利演出に接続しない。
- 次回は既存コードの姿勢を起点にポーズ参照を作り、姿勢参照を使える方式を確認してから少数再試作する。契約変更や高額モデルへの切替を自動で行わない。

## 6. DEV比較画面

入口：ためす（開発）→人物 歩行比較→G。

- 1 森、2 拡大、3 戦闘配置、4 茶髪／不採用水色、5 主人公／セナ素顔／仮面、6 獣の姿勢。
- Tabで6画面を巡回。左右キーで通常の本体を反転。Escapeで人物比較へ戻る。
- 森：Sで獣／セナを切替。Pで主人公の位置、Uで会話窓。背景は採用済みv19の森。
- 戦闘配置：Yで警戒／姿勢差分、Gでコード／生成。生成の姿勢差分には不合格表示を付ける。
- 本番のBattleSceneではなく静止画配置比較。独立Playerを使用し、ユーザーの保存や物語進行へは接続しない。
- 原本の読込・寸法失敗は表示する。全試作は本番目録へ登録せず、DEV経由のみ。

## 7. 検証

- 原本検査：v20・v21を含め11枚のハッシュ・寸法・透過・端を確認。セナも人物の64×96上限で検査するよう拡張。
- 人物色：子供・成人、待機2／歩行4、左右、主人公肖像、他の人物へ色変更が混入しないことを確認。
- 原本・人物色・森素材・採用素材・森本編・パネル・保存・導入戦・物語戦・台本・バランス・制作上限・正典・分布・build・bundleの16項目を通過。
- tsxの人物色検査はサンドボックス内のWindowsユーザー情報取得で失敗したため、通常権限で再実行して通過。森本編検査も既知の同制限を避けて実行。アプリ本体のメモリ不足ではない。
- 本番は6ファイル、JS228.41kB／gzip74.78kB。画像は背景1点。v22比較画面・セナPNG・獣の試作PNGの混入をbundle検査で防ぐ。
- 全編の通常導線による手動通しは未完了。今回の静止画比較や自動検証で代替しない。
- `sena-lineup-v22.png`：1280×720 viewport、Canvas表示960×540。主人公／素顔／仮面を3倍で確認。床の灰色が混じった中間版は最終比較に使わず、床除去版へ差し替えた。
- `sena-forest-v22.png`：採用森背景、右向き、通常表示、比較説明。茶髪と青緑が明るい遠景・暗い幹の両方から分かれる。
- `sena-forest-left-dialogue-v22.png`：左向き、会話窓表示。現在は身体全体の反転検査であり、左手の指輪演出の合格ではない。
- 5 セナ、6 獣、森のS、P、U、左右反転を画面で確認。生成獣の前脚が直立したままなのを拡大で確認し、不合格表示へ変更した。

## 8. 次の再開地点

1. ユーザーへ元の茶髪とセナの素顔／仮面を並べて示し、人物の印象を確認する。
2. この方向で進む場合は主人公の待機2／歩行4を先に少数制作。セナも同じ接地・Canvas・テンポへそろえる。フレームごとの自動トリミングやサイズ変更はしない。
3. セナの身体、左手の物語動作、指輪を別レイヤーで接続し、左右の正典を再検証する。
4. 獣は姿勢参照を準備したうえで限定再試作。歩行制作と無関係に既存コードの非殺傷決着は守る。
5. 必要な動作と左右・会話・本編遷移を確認してから、キャラPNGを本番目録へ採用する。
6. 他の地域・人物の大量生成、オンライン実装、全編完了を今回の達成に含めない。
