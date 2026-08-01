import rawNotices from "../../data/dialogue/notices.json";

/**
 * 「しらべる」で家具に向かったときの一行（data/dialogue/notices.json）。
 *
 * 調べるたびに順に進み、一巡したら先頭へ戻る。
 * **同じ物を何度も調べるのは、プレイヤーの自然な行動である。**
 * そこに毎回同じ一行を返すのは、いちばん頻度の高い露出経路を捨てるのに等しい。
 */

type NoticeTable = Record<string, { ch1: string[]; ch2?: string[] }>;

const TABLE = Object.fromEntries(
  Object.entries(rawNotices as unknown as NoticeTable).filter(([k]) => !k.startsWith("_")),
) as NoticeTable;

/**
 * タイル文字に対応する次の一行を返す。無ければ undefined。
 * @param counters 何回目かを覚えておく入れ物（FieldState が持つ）
 */
export function nextNotice(
  tile: string,
  chapter: number,
  counters: Map<string, number>,
): string | undefined {
  const entry = TABLE[tile];
  if (!entry) return undefined;

  // 炎上後は専用の文がある物だけ差し替える。無ければ平時の文で通す
  const burning = chapter >= 2 && entry.ch2 !== undefined && entry.ch2.length > 0;
  const lines = burning ? entry.ch2! : entry.ch1;
  if (lines.length === 0) return undefined;

  const key = `${tile}:${burning ? 2 : 1}`;
  const i = counters.get(key) ?? 0;
  counters.set(key, (i + 1) % lines.length);
  return lines[i];
}

/** 露出回数を数えるツールから使う */
export const NOTICE_TABLE = TABLE;
