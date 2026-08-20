/**
 * アスキーマップのパーサ本体（設計書 7.4）。
 *
 * **ここには Vite 固有のものを置かない。**
 * 部屋の読み込み（`import.meta.glob`）は mapFormat.ts に分けてある。
 * こちらは素の Node からも読めるので、道具（npm run reach）が同じパーサを使える。
 *
 * Tiled 等のGUIエディタは使わない。マップはテキストで持ち、
 * AIも人間もそのまま読み書きできる形にする。
 *
 * ファイルは data/maps/*.room。1ファイル＝1部屋。
 *
 * 書式：
 *   !id    ch1_reading            … マップID（必須）
 *   !name  閲覧室                  … 画面に出す部屋名
 *   !spawn 14 6                   … 初期位置（デバッグ用の既定値）
 *   !npc   a mira                 … 文字 a の位置に NPC mira を置く
 *   !enemy 1 bookworm sootbat     … 文字 1 の位置に敵シンボル。
 *                                    2つ目を書くと第2章ではそちらが出る。
 *                                    片方だけの章にしたいときは `-` を置く
 *                                    （例: `!enemy 3 - emberfiend` は第2章のみ）
 *   !door  d ch1_stacks 14 1      … 文字 d の位置に別マップへの出入口
 *   !sign  s notice_board         … 文字 s の位置に調べられる点。
 *                                    3つ目に見た目（paper / carve / ash / hole）。省略で紙
 *   !vault k                      … 文字 k の位置に禁書（調べると書き込みへ）
 *   !map                          … これ以降がマップ本体
 *
 * タイル（大文字と記号）:
 *   #  壁       .  床       B  本棚     T  机
 *   C  燭台     =  カウンター  V  階段（通行不可）
 *
 * エンティティ（小文字と数字）は !npc / !enemy / !door / !sign で宣言する。
 * 宣言された文字のマスは床として扱われる。
 */

export type Tile = "#" | "." | "B" | "T" | "C" | "=" | "V";

const TILES = new Set<string>(["#", ".", "B", "T", "C", "=", "V"]);

/** 通行できるタイル */
export function walkable(t: Tile): boolean {
  return t === ".";
}

export type EntityKind = "npc" | "enemy" | "door" | "sign" | "vault";

/**
 * 調べられる点の見た目（`!sign` の3つ目）。
 *
 * 以前は全部おなじ「紙」の四角で描いていた。すると**床石に煤で書いた字**も
 * **石壁の彫り跡**も紙に見える。調べる物が一種類しか無いように見えるので、
 * 部屋を見回す気にならない。**絵が3種あるだけで、見回す動機になる。**
 */
export type SignLook = "paper" | "carve" | "ash" | "hole";

const SIGN_LOOKS = new Set<string>(["paper", "carve", "ash", "hole"]);

export type MapEntity = {
  kind: EntityKind;
  /** npc なら会話ID、enemy なら敵ID、door なら遷移先マップID */
  ref: string;
  x: number;
  y: number;
  /** door の遷移先座標 */
  toX?: number;
  toY?: number;
  /** enemy のみ。第2章で入れ替わる敵ID。`-` はその章に出ないことを表す */
  ref2?: string;
  /** sign のみ。省略したら紙 */
  look?: SignLook;
};

/** 章に応じた敵ID。その章に出ないなら undefined */
export function enemyRefFor(e: MapEntity, chapter: number): string | undefined {
  const ref = chapter >= 2 && e.ref2 !== undefined ? e.ref2 : e.ref;
  return ref === "-" ? undefined : ref;
}

export type GameMap = {
  id: string;
  name: string;
  w: number;
  h: number;
  /** [y][x] */
  tiles: Tile[][];
  entities: MapEntity[];
  spawn: { x: number; y: number };
};

type Decl = {
  kind: EntityKind; ref: string;
  toX?: number; toY?: number; ref2?: string; look?: SignLook;
};

export function parseMap(text: string): GameMap {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  let id = "";
  let name = "";
  let spawn = { x: 1, y: 1 };
  const decls = new Map<string, Decl>();
  let mapStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.startsWith("!")) continue;
    const [directive, ...args] = line.slice(1).trim().split(/\s+/);

    switch (directive) {
      case "id":    id = args[0] ?? ""; break;
      case "name":  name = args.join(" "); break;
      case "spawn": spawn = { x: Number(args[0]), y: Number(args[1]) }; break;
      case "npc":   decls.set(args[0]!, { kind: "npc", ref: args[1] ?? "" }); break;
      case "enemy":
        decls.set(args[0]!, { kind: "enemy", ref: args[1] ?? "", ref2: args[2] });
        break;
      case "sign": {
        const look = args[2];
        // 綴りを間違えたまま静かに紙で描かれると気づけない。ここで落とす
        if (look !== undefined && !SIGN_LOOKS.has(look)) {
          throw new Error(`マップ ${id || "?"}: !sign の見た目 "${look}" は未定義`);
        }
        decls.set(args[0]!, { kind: "sign", ref: args[1] ?? "", look: look as SignLook });
        break;
      }
      case "vault": decls.set(args[0]!, { kind: "vault", ref: "vault_altar" }); break;
      case "door":
        decls.set(args[0]!, {
          kind: "door", ref: args[1] ?? "",
          toX: Number(args[2]), toY: Number(args[3]),
        });
        break;
      case "map":   mapStart = i + 1; break;
      default:
        throw new Error(`マップ ${id || "?"}: 不明な指示 !${directive}`);
    }
    if (mapStart >= 0) break;
  }

  if (mapStart < 0) throw new Error(`マップ ${id || "?"}: !map が無い`);

  // 末尾の空行を落とす
  const rows = lines.slice(mapStart);
  while (rows.length > 0 && rows[rows.length - 1]!.trim() === "") rows.pop();

  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));

  const tiles: Tile[][] = [];
  const entities: MapEntity[] = [];

  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    const src = rows[y]!;
    for (let x = 0; x < w; x++) {
      const ch = src[x] ?? "#"; // 行が短い場合は壁で埋める
      if (TILES.has(ch)) {
        row.push(ch as Tile);
        continue;
      }
      const decl = decls.get(ch);
      if (decl) {
        entities.push({
          kind: decl.kind, ref: decl.ref, x, y,
          toX: decl.toX, toY: decl.toY, ref2: decl.ref2, look: decl.look,
        });
        row.push("."); // エンティティの足元は床
        continue;
      }
      if (ch === " ") { row.push("#"); continue; }
      throw new Error(`マップ ${id}: (${x},${y}) の文字 "${ch}" が未定義`);
    }
    tiles.push(row);
  }

  if (!id) throw new Error("マップに !id が無い");
  return { id, name, w, h, tiles, entities, spawn };
}
