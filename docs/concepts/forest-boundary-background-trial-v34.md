# 白い木の境の背景試作 v34

> 更新日：2026-09-14  
> 状態：v34試作記録。後続v35で正式採用済み（`forest-boundary-background-adoption-v35.md`）  
> 生成方式：Codex組込みImageGen

## 1. 画面の役割

村門の次、白樹の獣と出会う `forest_boundary` を対象にする。左側は村に近い明るい草地と遠い丘、右側は三本の白樺と深い青緑の森とする。初めて獣と対峙する場面と、終盤にセナと帰還して境界を決める場面の両方で使える固定景観を目指す。

参照画像は本作の正式村門 `src/assets/series2/backgrounds/village_gate/middle.png` と正式森入口 `src/assets/series2/backgrounds/forest_edge/middle.png`。それぞれ村から続く光・土・白樺の材質、森の奥行き・ドットのまとまりの基準とした。他作品や第三者の画像は入力していない。

## 2. 保存物と変換

すべて `docs/concepts/` 配下の制作資料。本番Manifestは16エントリを維持する。

| ファイル | 寸法 | bytes | SHA-256 |
|---|---|---:|---|
| `forest-boundary-imagegen-a-v34.png` | 1672×941 | 1,952,205 | `545e76b653a0ebdeb44e09d2fed55d262d39c33d448ed1b6506ae8ed4a10a8b1` |
| `forest-boundary-game-palette-v34-1x.png` | 480×270 | 163,746 | `6b1e6026b116174346f5d83334301b1060f6e5a9af11dfde8cd1b8eada698f36` |
| `forest-boundary-game-palette-v34.png` | 960×540 | 194,446 | `5028a70a04e242deaf1f2003a5060a05330400e801c0d0c3e82193db6a66342f` |

`tools/prepare-forest-boundary-v34.ts` は村門v32と同じ決定的変換を使う。原本の路面上端565をゲーム座標162へ合わせ、人物足元176を水平な土道へ収める。正式森入口の138色へ重み付きRGB距離で写像し、480×270を厳密な整数2倍で960×540にする。生成原本は上書きしない。

## 3. 固定景観と動的描画

画像には丘、草地、白樺、奥の森、古木、土道を含める。足跡、掻き跡、胞子、薄霧、獣、人物、UIはコードで重ねる。

`renderForestBoundary` へ任意画像を渡せるようにし、未読込・欠落・寸法違いはコード版へ戻す。胞子と薄霧は `drawForestBoundaryAtmosphere` を共有する。足跡は `drawForestBoundaryTracks` へ分離し、画像版だけ地面に合わせて縦位置を補正する。調査点x170と足跡の向きは維持する。既存のコード背景は従来の足跡座標を使う。

`FOREST_BOUNDARY_BACKGROUND_ID` は注入キーだけを用意した。正式Manifestへは未登録なので、通常進行では引き続きコード背景を表示する。

## 4. 比較方法

ローカル開発画面で「ためす（開発）」→「背景　4地域比較」→ **B**。

- G：候補画像／コード背景
- U：獣との対峙／戦闘後／セナと帰還
- C：静景／人物・物語状態・UIを合成
- H：比較用操作表示の表示／非表示
- P：足跡の調査点／各場面の開始位置
- ENTER：本編の会話を開始・送る
- BまたはESC：4地域比較へ戻る

`ForestBoundaryPreviewScene` は本物の `SideViewScene` に使い捨ての状態と画像を渡す。保存の読み書き、外のマップへの移動、実戦闘への遷移を行わない。探索人物と獣は現行本編のコード描画をそのまま使用する。終戦・単一EDで採用した人物PNGへの探索側の切替は今回の変更に含まない。

## 5. 実画面と検証

ローカルブラウザで次を確認した。

- 獣との対峙：主人公と獣が足元176へ接地し、白い角と背後の白樺・森を判別できる
- 導入会話：会話窓が下部の落ち着いた土道に収まり、獣の姿と干渉しない
- 戦闘後：獣の出現条件が解除され、開いた道と探索HUDが表示される
- セナと帰還：本編のセナ、主人公、セナの肖像付き会話が合成される

自動検証：

- `npm run build`：成功
- `npm run verify:forest-boundary-trial`：原本ハッシュ、138色、路面162・足元176、整数2倍を検証
- `npm run verify:forest-boundary-scene`：画像あり／なし、5種の不正画像、静景、足跡の路面配置、三状態×画像有無の本編調査会話、保存不変を検証
- `npm run verify:forest-scene`：既存森入口の歩行・調査・遭遇・復帰の回帰検証に成功
- `npm run verify:bundle`：配布20ファイル、候補画像とDEV比較パスの混入なし

tsxの2テストはWindowsサンドボックスの `uv_os_get_passwd` で起動できなかったため、許可された通常権限で再実行して成功した。

## 6. 実送信プロンプト

```text
Use case: stylized-concept
Asset type: original fixed-screen side-view RPG forest-boundary background, one 16:9 landscape image.
Input images: Image 1 is the adopted village gate, a style and spatial continuity reference for turquoise daylight, moss, earth, and white birch bark. Image 2 is the adopted forest entrance, a style reference for crisp pixel clusters, dark old trees, restrained canopy, and readable horizontal ground. Neither image is an edit target.
Primary request: Create the next screen to the right of the village gate: the quiet clearing called the White Tree Boundary where a protective white-antlered beast will later stand. Draw the empty environment only.
Composition: straight-on horizontal side-view game camera, matching both references, no top-down view. Left third is open sunlit meadow fringe with distant hills glimpsed through sparse foliage. Three recognizable slim white birch trunks stand in the right half, centered approximately at 60%, 72%, and 85% of width. They form a natural boundary, not a gate or arch. Behind their upper trunks lies deep blue-green forest shadow. The right edge has an old dark tree and layered woodland continuing offscreen. Leave the center and right-center open enough for an 80x64 game creature at x334 with feet y176 and a human at x370; avoid bright dense bark clutter behind their faces.
Ground: packed-earth road begins at exactly 60% of height (game y162), stays level across the entire width, fills the lower 40%, and is clear at feet height 65% (game y176). Quiet broad umber and ochre pixel clusters in lower third for dialogue UI. No receding road, stairs, ledge, cliff, river, platform edge, or perspective corridor. No roots or shrubs crossing the walking band.
Style: polished game pixel art with hard square edges and deliberate clusters, reference-matched late 16-bit/32-bit material richness. Warm muted gold rim light, turquoise atmospheric distance, moss and olive foliage, deep teal shadow, aged ivory birch bark with dark scars. Natural summer morning with a slightly hushed mood, inviting and mysterious.
Constraints: no village buildings or architecture, gate posts, masonry, ruins, religious objects, torii, arch, signs, glyphs, text, logo, watermark, frame, people, characters, creatures, animals, equipment, footprints, claw marks, particles, visible light beams, UI or magical effects. Tracks, beast, people and moving atmosphere will be rendered separately by the game. No smooth painting, gradients, antialiasing, photorealism, 3D, tiny noisy detail, or recognizable elements from another game. Match the scale and visual texture of the references; do not copy their exact tree arrangement.
```

## 7. 次工程

この候補の景観を確認した後、正式素材へ配置し、村門からの往復と通常進行の導入戦・終盤帰還に接続する。正式化時も足跡・獣・セナ・会話はコード層として保つ。
