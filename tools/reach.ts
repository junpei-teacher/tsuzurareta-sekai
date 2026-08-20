/**
 * 部屋のつながりを確かめる（`npm run reach`）。
 *
 * 敵と人が床を塞ぐようにしたので、**通れなくなった場所が無いか**を機械で見る。
 * 目で追うと、章ごとに出入りする相手が違うぶんを見落とす。
 *
 * 見るのは1部屋ずつ。入口（`!spawn` と、他の部屋から入ってくる座標）から歩いて、
 * その部屋の出口・調べる点・敵・人・禁書の台に**全て隣接できるか**を確かめる。
 * 隣接できれば「しらべる」で触れる。
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMap, walkable, enemyRefFor, type GameMap, type MapEntity } from "../src/field/mapParse.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const MAPS = new Map<string, GameMap>();
for (const f of readdirSync(join(ROOT, "data/maps"))) {
  if (!f.endsWith(".room")) continue;
  const m = parseMap(readFileSync(join(ROOT, "data/maps", f), "utf8"));
  MAPS.set(m.id, m);
}

/** その章でその人物が出るか。会話データの chapters を読む */
const DIALOGUE: Record<string, { chapters?: number[]; battleAfter?: string }> = {};
for (const f of ["ch1", "ch2", "ch3"]) {
  const raw = JSON.parse(readFileSync(join(ROOT, "data/dialogue", `${f}.json`), "utf8")) as
    Record<string, { chapters?: number[]; battleAfter?: string }>;
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_")) continue;
    if (!DIALOGUE[k] || v.chapters) DIALOGUE[k] = v;
  }
}
const speakerIn = (ref: string, ch: number): boolean => {
  const sp = DIALOGUE[ref];
  if (!sp) return false;
  return !sp.chapters || sp.chapters.includes(ch);
};

/** 第2章の瓦礫。data/maps/ch2.json の block だけ見る（open は倒してから開く） */
const CH2 = JSON.parse(readFileSync(join(ROOT, "data/maps/ch2.json"), "utf8")) as
  Record<string, { block?: number[][] }>;

function active(e: MapEntity, ch: number): boolean {
  if (e.kind === "npc") return speakerIn(e.ref, ch);
  if (e.kind === "sign") return speakerIn(e.ref, ch);
  if (e.kind === "enemy") return enemyRefFor(e, ch) !== undefined;
  return true;
}

const rubble = (m: GameMap, ch: number, x: number, y: number): boolean =>
  ch === 2 && (CH2[m.id]?.block ?? []).some((c) => c[0] === x && c[1] === y);

/**
 * **倒せば消えるものは、塞いでいないものとして数える。**
 *
 * 敵のシンボルと、戦ってから消える相手（`battleAfter`）は一時的な壁である。
 * これを壁として数えると「敵の向こうへ行けない」と出るが、
 * 実際は倒せば通れるので、そこは誤りになる。
 * 塞ぎ続けるのは、壁・家具・張り紙・禁書の台、そして**ずっと居る人**だけ。
 */
function blocked(m: GameMap, ch: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  if (rubble(m, ch, x, y)) return true;
  if (!walkable(m.tiles[y]![x]!)) return true;
  for (const e of m.entities) {
    if (!active(e, ch)) continue;
    if (e.kind === "door" || e.kind === "enemy") continue;
    if (e.kind === "npc" && DIALOGUE[e.ref]?.battleAfter) continue;
    if (e.x === x && e.y === y) return true;
    // 人は縦2マス。頭のマスも塞ぐ
    if (e.kind === "npc" && e.x === x && e.y === y + 1) return true;
  }
  return false;
}

/** 部屋に入ってくる座標を全部集める。他の部屋の !door が指す先 */
function entriesOf(id: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const m = MAPS.get(id)!;
  out.push([m.spawn.x, m.spawn.y]);
  for (const other of MAPS.values()) {
    for (const e of other.entities) {
      if (e.kind === "door" && e.ref === id) out.push([e.toX ?? 1, e.toY ?? 1]);
    }
  }
  return out;
}

let problems = 0;

for (const ch of [1, 2, 3]) {
  const rooms = [...MAPS.values()].filter((m) => {
    if (ch === 3) return m.id.startsWith("ch3_");
    if (ch === 2) return m.id.startsWith("ch1_") && m.id !== "ch1_inkroom";
    return m.id.startsWith("ch1_");
  });

  console.log(`\n══ 第${ch}章 ═══════════════════════`);
  for (const m of rooms) {
    // 入口から歩ける範囲を塗る
    const seen = new Set<string>();
    const queue: Array<[number, number]> = [];
    for (const [sx, sy] of entriesOf(m.id)) {
      if (blocked(m, ch, sx, sy)) continue;
      seen.add(`${sx},${sy}`);
      queue.push([sx, sy]);
    }
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx!, ny = y + dy!;
        const k = `${nx},${ny}`;
        if (seen.has(k) || blocked(m, ch, nx, ny)) continue;
        seen.add(k);
        queue.push([nx, ny]);
      }
    }

    // 触れるべきものに、全部隣接できるか
    const missed: string[] = [];
    for (const e of m.entities) {
      if (!active(e, ch)) continue;
      // 第2章で瓦礫に埋まった扉は、通れなくてよい（設計書 2.8）
      if (e.kind === "door" && rubble(m, ch, e.x, e.y)) continue;
      const near = [[0, -1], [0, 1], [-1, 0], [1, 0]]
        .some(([dx, dy]) => seen.has(`${e.x + dx!},${e.y + dy!}`));
      // 扉は踏んで移るので、そのマス自体に立てるかを見る
      const ok = e.kind === "door" ? seen.has(`${e.x},${e.y}`) : near;
      if (!ok) missed.push(`${e.kind}:${e.ref}@${e.x},${e.y}`);
    }

    const mark = missed.length === 0 ? "ok" : "✕ ";
    console.log(`  ${mark} ${m.name.padEnd(8, "　")} 歩ける ${String(seen.size).padStart(3)} マス` +
      (missed.length ? `　届かない: ${missed.join(" ")}` : ""));
    problems += missed.length;
  }
}

console.log(problems === 0
  ? "\nどの部屋も、触れるべきものに全て届きます。"
  : `\n**${problems} 件、届きません。**`);
if (problems > 0) process.exit(1);
