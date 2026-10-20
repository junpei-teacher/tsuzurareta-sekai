# 共同倉背景の正式採用 v28

> 日付：2026-09-08  
> 状態：本番採用済み／通常導線の三時代・夜を実画面確認済み  
> 選定元：`docs/concepts/storehouse-background-trial-v27.md`

## 1. 採用物

- ID：`background.village_storehouse.middle`
- 正式ファイル：`src/assets/series2/backgrounds/village_storehouse/middle.png`
- 寸法：960×540（480×270設計のnearest整数2倍）
- 透過：なし
- 使用色：86色
- SHA-256：`47a127bb62e17edef260b53c775d23eae4b54dad10c21487d72b979983a7d7c4`

正式PNGはv27の `storehouse-game-palette-v27.png` と同一バイト列である。生成C、480×270派生、比較用960×540は制作資料に残すが、本番から参照しない。

## 2. 画像とコードの分担

PNGへ固定したものは、壁、床、梁、左右の空棚、中央札板、右上の窓、金具、補修跡、朝の基礎光である。

次は物語状態なので `renderStorehouse` のコード層に残した。

- 十年前8点／現在3点の棚在庫
- セナ札、主人公札、消えた札の日焼け跡と釘穴
- 夜の青緑・紫の色幕
- 子供／成人の人物、配給袋、樹脂瓶、会話窓、Bloom

下段の主人公札は、吊り紐が上段の欠落跡へ重ならないよう試作位置から3px下げた。プロローグの夜は、正式背景の札位置を検出して文字消失と落ちる紐を同じ座標へ合わせる。

## 3. 接続

`series2Assets.ts` の専用目録から起動時に読み、次の通常Sceneへ同じ画像を注入する。

- `PrologueScene`：十年前と、名前が消える夜
- `VillagePlaceholderScene`：十年後、棚が乏しくセナ札がない現在
- `Series2EndingScene`：セナが戻り、本人の前へ一袋を置く終幕

読込未完了、欠落、寸法違いでは `isStorehouseBackgroundReady` が失敗し、従来のコード背景へ戻る。物語進行は画像の成否に依存しない。

DEV「背景　共同倉v27」も独自の在庫・札描画を廃止し、本番と同じ `renderStorehouse` を通す。`G`、`U`、`N`、`C` の比較操作は本番へ含めない。

## 4. 実画面確認

ローカルブラウザで次を確認した。

- 通常の「はじめから」から名前を刻み、十年前の共同倉へ入る
- 在庫8点、SENA／主人公の二枚の札、子供二人、足元176
- 森の会話後、夜の共同倉でSENAの文字と札が正式板上から消える
- 同じ画角の十年後へ切り替わり、在庫3点、空欄、主人公札、成人主人公、管理人、二袋が読める
- 本番Manifestを使う単一EDで、主人公、セナ、二袋、樹脂瓶、本文が競合しない
- DEV比較で十年前／現在／終幕と昼／夜を切り替えても配置がずれない

## 5. 自動検証

- `npm run build`：TypeScriptと本番build成功
- `npm run verify:assets`：正式14エントリの命名、ID、寸法、透過、ハッシュ、欠落・余分なし
- `npm run verify:storehouse-trial`：生成Cからの決定的変換と正式PNGの同一バイト列
- `npm run verify:storehouse-story`：三つの通常Sceneへの注入、動的在庫・札、夜座標、フォールバック、DEV共通経路
- `npm run verify:character-story-integration`：単一EDの人物層と共同倉背景を同時に接続
- `npm run verify:panels`：25画面・25戦・単一EDの因果到達
- `npm run verify:bundle`：18ファイル。本番PNGは森1＋共同倉1＋人物11実体。資料PNGとDEVパスなし

## 6. 次工程

共同倉は正式採用で閉じる。次は大量生成へ進まず、第一章で長く滞在する村道と村門の景観を、共同倉と森入口の色・材質へ接続する。固定構図と状態小物を先に分離し、1画面ずつ少数試作する。
