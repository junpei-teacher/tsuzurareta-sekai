# 素材の出典と利用条件

公開する前に、**ここが埋まっていること**を必ず確認する（手順書 Phase 9）。

---

## 絵

すべて **PixelLab** で生成し、このリポジトリで加工したもの。
生成物の権利は PixelLab の利用規約（https://pixellab.ai/termsofservice）に従う。

| | 生成方式 |
|---|---|
| 主人公 | `create_character` v3 ＋ `animate_character` pro（歩行） |
| ミラ・司書長・兵士・抹消された名前の者 | `create_character` v3 |
| 立ち絵 | `create_portrait_character`（フィールドの姿から変換） |
| 敵の1枚絵・フィールドの敵シンボル | `create_image_pro` / `create_map_object` |
| タイル・家具 | `create_topdown_tileset` / `create_map_object` |
| 階段 | **生成物ではない。** `src/scenes/field.ts` の `renderStairs()` で手描き |

---

## 音（**未収録**）

置き場所は `public/assets/bgm/`。ファイル名は `src/core/audio.ts` の `TRACKS` と揃えること。
**曲が無くてもゲームは動く**（読み込みに失敗した曲は無音として扱う）。

### 揃えるもの

| ファイル名 | 場面 | 尺 | ループ | 中身 |
|---|---|---|---|---|
| `opening.ogg` | オープニング | 40秒 | しない | ピアノ単音。ほぼ無伴奏 |
| `ch1_quiet.ogg` | 第1章 静かな書庫 | 90秒 | する | 低い弦のロングトーン ＋ 等間隔の刻み。**眠い** |
| `ch2_burning.ogg` | 第2章 燃える夜 | 90秒 | する | **ch1 と同じ旋律の短調・速い版。** 低い打楽器を足す |
| `ch3_depths.ogg` | 第3章 最下層 | 120秒 | する | **旋律なし。** 持続音と、不規則に落ちる一音だけ |
| `battle.ogg` | 通常戦闘 | 45秒 | する | 打鍵の邪魔をしない速さ。主張しすぎない |
| `boss.ogg` | ボス戦 | 60秒 | する | battle に低音の合唱を重ねた雰囲気 |
| `ending.ogg` | エンディング | 60秒 | しない | **opening のピアノが戻ってくる** |

### いちばん大事なところ

**`ch1_quiet` と `ch2_burning` は同じ曲の変奏にする。**

第1章と第2章は同じマップの炎上版なので（設計書 2.8）、音も同じ曲の炎上版にする。
プレイヤーは第2章で「この曲、知っている」と気づく。
**同じ夜の続きであることが、説明せずに伝わる。**

第3章で旋律を取り上げるのも同じ理屈で、地下は言葉が失われた場所だから。

### 入手先の候補

| | 条件 | 向き |
|---|---|---|
| **PeriTune** https://peritune.com/ | CC BY（作者名の表記が必要） | RPG向けが多く、**同一作曲者で7本揃う**。第一候補 |
| 甘茶の音楽工房 https://amachamusic.chagasi.com/ | 表記不要 | 静かなピアノと弦。opening / ending 向き |
| 魔王魂 https://maou.audio/ | 表記必要 | SE も揃う |

**7本すべてを同じ作曲者で揃えるのが望ましい。** 寄せ集めると曲ごとに音色が変わり、
場面が変わるたびに別のゲームになったように聞こえる。

### 表記（曲を入れたら埋める）

```
BGM: （作曲者名） https://（URL）
     CC BY 4.0 https://creativecommons.org/licenses/by/4.0/
```

<!-- 曲を入れたら、上の欄を実際の作者名で埋めてから公開すること -->

---

## フォント

PixelMplus12（M+ FONT LICENSE / 自由に利用可）
https://itouhiro.hatenablog.com/entry/20130602/font

---

## 操作

音量は `-` と `=`。**呪文は A-Z と 0-9 だけ**なので、詠唱中に押しても綴りに入らない。
0 まで下げれば消音。設定は localStorage に残る。
