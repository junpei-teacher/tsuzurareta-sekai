/**
 * 画像アセットの読み込み（Phase 7）。
 *
 * 起動時にすべて読み終えてからゲームループを回す。
 * ドット絵なので枚数も容量も小さく、遅延読み込みの必要はない。
 *
 * パスは public/ からの絶対パス。実体は public/assets/... に置く。
 */

export type ImageMap = Record<string, HTMLImageElement>;

/** `key.0` `key.1` … の連番エントリを作る。テンプレートの {i} が番号に変わる */
function seq(key: string, template: string, count: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) out[`${key}.${i}`] = template.replace("{i}", String(i));
  return out;
}

/**
 * 読み込むアセットの一覧。ここが唯一の出典。
 *
 * NPCは画面内を歩かないので、必要なのは待機モーションだけ。
 * 4方向の歩行が要るのは主人公のみ（docs/アートバイブル.md 第6節）。
 */
export const MANIFEST: Record<string, string> = {
  // 主人公。画面内を歩く唯一のキャラなので4方向の歩行を持つ。
  // v5。**頭身を 3 → 4.5 に直した**。他のキャラが 4.5 前後なのに
  // 主人公だけ 3 頭身で、ミラと並ぶと別のゲームの絵に見えていた
  "hero.south": "/assets/sprites/hero5/south.png",
  "hero.north": "/assets/sprites/hero5/north.png",
  "hero.east": "/assets/sprites/hero5/east.png",
  "hero.west": "/assets/sprites/hero5/west.png",
  ...seq("hero.walk.south", "/assets/sprites/hero5/walk/south_{i}.png", 4),
  ...seq("hero.walk.north", "/assets/sprites/hero5/walk/north_{i}.png", 4),
  ...seq("hero.walk.east", "/assets/sprites/hero5/walk/east_{i}.png", 4),
  ...seq("hero.walk.west", "/assets/sprites/hero5/walk/west_{i}.png", 4),

  // Wang タイルセット（各16タイル・4x4シート・32px）
  // 減色はかけない。生成そのままの色をそのまま使う
  "tiles.stone": "/assets/tiles2/stone_pro.png",
  "tiles.shelf": "/assets/tiles2/shelf.png",

  // 家具。マスに乗せるスプライト（32pxタイル用に2倍サイズ）
  // 写字机は2種。**同じ寸法で、置いてあるものが違う。**
  // 同じ絵が16卓ならぶと、部屋が壁紙のように見える
  "prop.desk": "/assets/props2/desk.png",
  "prop.desk2": "/assets/props2/desk2.png",
  "prop.candle": "/assets/props2/candle.png",
  "prop.door": "/assets/props2/door.png",
  // 階段は絵を持たない。src/scenes/field.ts の renderStairs で組む
  "prop.rubble": "/assets/props2/rubble.png",

  // NPC。画面内を歩かないので待機の4方向だけ。キーの頭は .room の !npc の ref と揃える
  // ミラ v9。
  //
  // 他のNPCは「フィールドの姿 → 立ち絵」の順で作ったが、ミラだけ逆にした。
  // 文章で顔を指定しても可愛さが安定しなかったので、先に立ち絵を仕上げて、
  // それを `portrait_to_character` でフィールドの姿へ落とし、
  // `create_character` v3 の reference で4方向へ回している。
  // **顔が立ち絵と完全に一致し、描き込みも主人公・司書長と同じ密度になる。**
  //
  // 経緯として避けるべきものが3つ分かっている。
  //   裾が床まである服 … 足が描かれず、足首から下を切断されたように見える
  //   写実寄りの細面   … 「初期版のほうが可愛げがあった」と言われた
  //   立ち絵からの変換 … 顔は完璧に揃うが**頭が大きくなる**。
  //     胸像から起こすので当然で、v8 は 61px しかなく頭でっかちに見えた。
  //     結局これは捨て、文章で「5.5頭身・小さい頭・長い脚」と
  //     強く指定し直した v9（76px）に落ち着いた
  ...facing("mira", "/assets/sprites/mira9"),
  ...facing("librarian", "/assets/sprites/librarian"),
  ...facing("halven", "/assets/sprites/halven"),
  // 会話する相手のうち、以前は色付きの矩形で代用していたもの
  ...facing("soldier", "/assets/sprites/soldier"),
  ...facing("erased_one", "/assets/sprites/erased_one"),
  // 灰の中の声は人ではないので向きを持たない。南だけ置く
  "ashvoice.south": "/assets/mobs/ashvoice.png",

  // 立ち絵。素材は128pxで、64デザイン単位の枠にちょうど収まる。
  // 全て character_to_portrait で**フィールドの姿から起こしている**ので、
  // 顔と服がマップ上のドット絵と食い違わない
  "portrait.mira": "/assets/portraits/mira.png",
  "portrait.librarian": "/assets/portraits/librarian.png",
  "portrait.halven": "/assets/portraits/halven.png",
  "portrait.soldier": "/assets/portraits/soldier.png",
  // 灰の中の声だけは変換ではなく描き起こし。本の山はキャラではないため
  "portrait.ashvoice": "/assets/portraits/ashvoice.png",
  // 抹消された名前の者は、顔が白紙なのでバストにする意味がない。
  // 戦闘の立ち姿をそのまま枠に入れる。全身が枠に収まって、かえって不気味になる
  "portrait.erased": "/assets/enemies/erased.png",

  // 敵。戦闘は正面から見るだけなので、回転もアニメも持たない1枚絵。
  // そのぶんの予算を1枚の質に寄せてある（create_image_pro・候補から選抜）。
  // キーは data/enemies.json の id と対応させること
  ...enemySprites(
    "bookworm", "inkslime", "sootbat", "emberfiend",
    "soldier", "erased", "ashvoice", "archdemon",
    // 稽古台。第1章の写字机の間で、MPを使わずに呪文を試すための相手
    "dummy",
    // 「名を失くした頁」。**抹消された名前の者と絵を共用しない。**
    // 同類ではあるが、ボスは「消された人」でローブを着ており、
    // こちらは「人になりきれなかった紙」。布を着せないことで描き分ける
    "unnamed",
  ),

  // フィールドに置く敵シンボル。**戦闘の1枚絵とは別に描き起こす。**
  // 戦闘絵は大きさがまちまち（煤蝙蝠は128px＝4マス幅）で、
  // そのままマップに置くと壁を突き抜ける。ここは2マスに収まる小さな姿にする
  ...mobSprites(
    "bookworm", "inkslime", "sootbat", "emberfiend", "unnamed", "archdemon",
    "dummy",
  ),
};

/** フィールドの敵シンボル。キーは data/enemies.json の id */
function mobSprites(...ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) out[`mob.${id}`] = `/assets/mobs/${id}.png`;
  return out;
}

/** 敵スプライトのエントリを id から作る */
function enemySprites(...ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) out[`enemy.${id}`] = `/assets/enemies/${id}.png`;
  return out;
}

/** 4方向の待機エントリをまとめて作る */
function facing(key: string, dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of ["south", "north", "east", "west"]) out[`${key}.${d}`] = `${dir}/${d}.png`;
  return out;
}

/**
 * 1枚でも欠けたら握り潰さずログに出す。
 * 差し替え途中でファイル名を間違えたときに黙って矩形へ戻るのが一番困る。
 */
export async function loadImages(manifest = MANIFEST): Promise<ImageMap> {
  const entries = Object.entries(manifest);
  const loaded = await Promise.all(
    entries.map(([key, src]) =>
      new Promise<[string, HTMLImageElement | null]>((resolve) => {
        const img = new Image();
        img.onload = () => resolve([key, img]);
        img.onerror = () => {
          console.error(`アセットを読み込めません: ${key} → ${src}`);
          resolve([key, null]);
        };
        img.src = src;
      }),
    ),
  );

  const out: ImageMap = {};
  for (const [key, img] of loaded) if (img) out[key] = img;
  return out;
}

/** `key.0` から連番で並んでいるフレームを集める。無ければ空配列 */
export function frames(images: ImageMap, key: string): HTMLImageElement[] {
  const out: HTMLImageElement[] = [];
  for (let i = 0; ; i++) {
    const img = images[`${key}.${i}`];
    if (!img) break;
    out.push(img);
  }
  return out;
}
