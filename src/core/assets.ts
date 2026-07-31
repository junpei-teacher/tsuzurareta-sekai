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
  // 主人公。画面内を歩く唯一のキャラなので4方向の歩行を持つ
  "hero.south": "/assets/sprites/hero/south_pal.png",
  "hero.north": "/assets/sprites/hero/north_pal.png",
  "hero.east": "/assets/sprites/hero/east_pal.png",
  "hero.west": "/assets/sprites/hero/west_pal.png",
  ...seq("hero.walk.south", "/assets/sprites/hero/walk/south_{i}_pal.png", 4),
  ...seq("hero.walk.north", "/assets/sprites/hero/walk/north_{i}_pal.png", 4),
  ...seq("hero.walk.east", "/assets/sprites/hero/walk/east_{i}_pal.png", 4),
  ...seq("hero.walk.west", "/assets/sprites/hero/walk/west_{i}_pal.png", 4),

  "mira.south": "/assets/sprites/mira/south_pal.png",
  "mira.north": "/assets/sprites/mira/north_pal.png",
  "mira.east": "/assets/sprites/mira/east_pal.png",
  "mira.west": "/assets/sprites/mira/west_pal.png",
  // 待機モーション。本を抱えたまま、わずかに体が揺れる
  ...seq("mira.idle", "/assets/sprites/mira/walk_v3/south_{i}_pal.png", 5),
};

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
