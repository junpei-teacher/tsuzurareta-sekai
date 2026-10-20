import type { FieldState } from "../field/state.ts";
import type { Player } from "./player.ts";

const KEY = "funsho-no-yoru/run/v1";
type FieldData = Pick<FieldState,
  "chapter" | "mapId" | "x" | "y" | "facing" | "miraRoom" | "miraSeen"
  | "intro" | "titleCard" | "pendingReward"> & {
    defeated: string[];
    talkIndex: [string, number][];
  };
type RunData = {
  version: 1;
  target: "field" | "vault";
  player: Pick<Player, "name" | "hp" | "mp" | "maxHp" | "maxMp" | "items">;
  field: FieldData;
};
type FieldValidator = (field: FieldData) => boolean;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function validRun(value: unknown): value is RunData {
  if (!object(value) || value.version !== 1 || !["field", "vault"].includes(value.target as string)) return false;
  const p = value.player, f = value.field;
  if (!object(p) || !object(f) || !object(p.items)) return false;
  if (typeof p.name !== "string" || p.name.length === 0 || p.name.length > 32) return false;
  if (![p.hp, p.mp, p.maxHp, p.maxMp, p.items.ink, p.items.drop].every(integer)) return false;
  if ((p.hp as number) <= 0 || (p.hp as number) > (p.maxHp as number)
    || (p.mp as number) > (p.maxMp as number) || (p.maxMp as number) <= 0) return false;
  if (![1, 2, 3].includes(f.chapter as number) || typeof f.mapId !== "string"
    || !integer(f.x) || !integer(f.y) || !["up", "down", "left", "right"].includes(f.facing as string)
    || typeof f.miraRoom !== "string" || !strings(f.miraSeen) || !strings(f.defeated)
    || !strings(f.intro) || !Array.isArray(f.talkIndex)
    || !f.talkIndex.every((entry) => Array.isArray(entry) && entry.length === 2
      && typeof entry[0] === "string" && integer(entry[1]))) return false;
  if (f.titleCard !== null && (!object(f.titleCard)
    || typeof f.titleCard.main !== "string" || typeof f.titleCard.sub !== "string")) return false;
  const reward = f.pendingReward;
  return reward === null || (object(reward) && integer(reward.id)
    && typeof reward.word === "string" && strings(reward.lines));
}

function readRun(validate?: FieldValidator): RunData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!validRun(data) || (validate && !validate(data.field))) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasRun(validate?: FieldValidator): boolean {
  return readRun(validate) !== null;
}

/** 移動・会話・戦闘が完了した区切りで保存。同じ状態は書き直さない。 */
export function saveRun(player: Player, field: FieldState, target: RunData["target"] = "field"): boolean {
  const data: RunData = {
    version: 1, target,
    player: {
      name: player.name, hp: player.hp, mp: player.mp,
      maxHp: player.maxHp, maxMp: player.maxMp, items: { ...player.items },
    },
    field: {
      chapter: field.chapter, mapId: field.mapId, x: field.x, y: field.y,
      facing: field.facing, miraRoom: field.miraRoom, miraSeen: [...field.miraSeen],
      defeated: [...field.defeated], talkIndex: [...field.talkIndex],
      intro: [...field.intro], titleCard: field.titleCard, pendingReward: field.pendingReward,
    },
  };
  try {
    const raw = JSON.stringify(data);
    if (localStorage.getItem(KEY) !== raw) localStorage.setItem(KEY, raw);
    return true;
  } catch (e) {
    console.warn("途中経過を保存できませんでした", e);
    return false;
  }
}

export function loadRun(player: Player, field: FieldState, validate?: FieldValidator): RunData["target"] | null {
  const data = readRun(validate);
  if (!data) return null;
  Object.assign(player, data.player, { statuses: [] });
  Object.assign(field, data.field, {
    defeated: new Set(data.field.defeated), talkIndex: new Map(data.field.talkIndex),
  });
  return data.target;
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn("途中経過を削除できませんでした", e);
  }
}
