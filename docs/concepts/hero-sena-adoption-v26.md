# 主人公・セナの正式採用 v26

> 日付：2026-09-08  
> 状態：本番採用  
> Manifest：背景1点＋人物12エントリ

## 1. 採用判断

ユーザーが承認した茶髪主人公とセナの方向を、v24の接地統一、v25の終戦・単一ED実景合格を経て正式採用した。水色主人公は採用しない。仮面、左手、指輪、反応光は画像へ焼き込まず、物語の状態に応じるコード層を維持する。

## 2. 正式ファイル

| Manifest ID | 正式ファイル | 制作元 | SHA-256 |
|---|---|---|---|
| `character.hero.idle.0` | `characters/hero/idle_0.png` | v20茶髪修正版の完全コピー | `61b6664dd8f0b156f3ed2feadd2dd36ce753d0e85b1696ecedd89483771007e0` |
| `character.hero.idle.1` | `characters/hero/idle_1.png` | v23待機f1の完全コピー | `148613d28583701db5eb63e6a924db85b1ced6b98f20b7ef73e2d37a089b2dd5` |
| `character.hero.walk.0` | `characters/hero/walk_0.png` | v24接地f1の完全コピー | `e8b5db693d7e1ba1733f9dd320d3ae6c768ac1e8517a0fea232e142e26579900` |
| `character.hero.walk.1` | `characters/hero/walk_1.png` | v24接地f2の完全コピー | `5cf74eebe6273be2e43ab0110444f3d7071e6847164cbbd87c3353172fa6b23b` |
| `character.hero.walk.2` | `characters/hero/walk_2.png` | v24接地f3の完全コピー | `e9646daea53cc0ae410f76b0de07a33902db291c8c05ee8e57cc3de6087c1f32` |
| `character.hero.walk.3` | `characters/hero/walk_3.png` | v24接地f4の完全コピー | `1527cdc1af3b72d920763da4d062e5f57b68eb1423eae2bb8c55f736360c5ea5` |
| `character.sena.idle.0` | `characters/sena/idle_0.png` | v22床除去素顔の完全コピー | `e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e` |
| `character.sena.idle.1` | `characters/sena/idle_1.png` | v23待機f1の完全コピー | `e3ebc172d2e9e5f0955fd31506adfe5c29216342cc90f0ae80ffd655bf587b7b` |
| `character.sena.walk.0` | `characters/sena/walk_0.png` | v24接地f1の完全コピー | `606a36f50446a9a21746fb035ae9eddd0190c7e6c71eeb906a4e44691481ff52` |
| `character.sena.walk.1` | `characters/sena/walk_1.png` | v24接地f2の完全コピー | `12168b01b1f3ea1f17a5cbfaee9fce6369c5c27cc544519747c17fc9ec34eff3` |
| `character.sena.walk.2` | `characters/sena/walk_2.png` | v24接地f3の完全コピー | `42fa9a1fa79a7913b0fd6762f8ea42c90d8bfc886c9f50388f4c3640a7ec87bf` |
| `character.sena.walk.3` | `characters/sena/walk_3.png` | v24接地f4の完全コピー | `e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e` |

パスはすべて `src/assets/series2/` 以下。12枚とも32×48、アルファは0または255だけで、透明背景を持つ。セナの `idle_0` と `walk_3` は同一内容のため、本番ビルドでは1ファイルへ重複排除される。

## 3. 本番接続

- `src/core/series2Assets.ts` に12エントリ、寸法、透過方式、SHA-256を登録した。
- 起動時の共通画像ローダーで背景と一緒に読み、`GeneratedStoryCharacterLayer`へ注入する。
- 通常進行の `SenaRevealScene` と `Series2EndingScene` に正式人物レイヤーを渡す。
- 読込失敗・寸法違いでは、Sceneが従来のコード人物へ戻る。進行を止めない。
- 比較・停止・時刻送りの操作はDEV入口でだけ有効。通常進行へ開発パネルを出さない。
- 人物比較画面も本番Manifestと同じ正式PNGを使い、資料パスを直接読まない。

## 4. 検証

- `npm run build`：成功。
- `npm run verify:assets`：正式13エントリ（背景1＋人物12）の命名、ID、SHA-256、32×48／960×540、二値透過／不透明、参照、欠落、余分なファイルを確認。
- `npm run verify:bundle`：17ファイル。人物11 PNG（同一内容1組を重複排除）、背景1、JS、CSS、HTML、フォント、ライセンス。`docs/concepts/`や不採用名は含まない。
- `npm run verify:character-story-integration`：通常の終戦・EDが正式人物層を受け、DEVだけ比較操作を有効にすることを確認。
- 実ブラウザを正式パスで再読込し、タイトル、共同倉、村道、王国への道を確認した。初期化順の不具合を実画面で発見し、人物表の構築をコンストラクタ本体へ移して修正。修正後の再読込は正常。

## 5. 生成・権利境界

正式採用は既存の自作生成物と接地派生の完全コピーで行った。新しい生成、編集サービスへの送信、追加費用、原本上書きはない。2026-08-31に確認したPixelLab利用条件と、v20〜v24の生成・加工記録を継承する。

## 6. 次工程

人物の基準はここで固定する。次は共同倉の背景を少数試作し、承認済み森背景の色鮮やかな材質感を、生活空間の木・布・樹脂瓶・夕方の灯りへ展開する。背景へ人物・文字・配給袋などの状態物を焼き込まない。
