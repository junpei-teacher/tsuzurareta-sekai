import { GAME_IDENTITY } from "../core/gameIdentity.ts";
import type { SideViewState } from "../sideview/types.ts";
import type { ItemKind, Player, Riddle } from "./player.ts";
import { validWeaponId } from "./weapons.ts";

export const PROFILE_KEY = `${GAME_IDENTITY.storagePrefix}/profile/v2`;
export const RUN_KEY = `${GAME_IDENTITY.storagePrefix}/run/v2`;

export type ProfileSave = {
  version: 2;
  discoveredWords: Array<[number, string]>;
  cleared: boolean;
  traces?: string[];
};

export type RunPosition =
  | { kind: "prologue_start" }
  | { kind: "sideview"; panelId: string; x: number; facing: -1 | 1 };

export type RunSave = {
  version: 2;
  name: string;
  chapter: number;
  position: RunPosition;
  flags: string[];
  knowledgeFlags: string[];
  defeated: string[];
  grimoire: Array<[number, string]>;
  unspoken: number[];
  riddles: Array<[number, Riddle]>;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  weapons: string[];
  equippedWeapon: string | null;
  items: Record<ItemKind, number>;
  objective: string;
  checkpoint?: EncounterCheckpoint;
};

export type CheckpointData = Omit<RunSave, "checkpoint">;
export type EncounterCheckpoint = {
  activeEncounterId: string;
  data: CheckpointData;
};

export type SaveResult = { ok: true } | { ok: false; message: string };

const emptyProfile = (): ProfileSave => ({ version: 2, discoveredWords: [], cleared: false });

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pairs(value: unknown): value is Array<[number, string]> {
  return Array.isArray(value) && value.every((entry) =>
    Array.isArray(entry) && entry.length === 2 && finite(entry[0]) && typeof entry[1] === "string"
  );
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function riddlePairs(value: unknown): value is Array<[number, Riddle]> {
  return Array.isArray(value) && value.every((entry) => {
    if (!Array.isArray(entry) || entry.length !== 2 || !finite(entry[0])) return false;
    const riddle = entry[1] as Partial<Riddle>;
    return typeof riddle?.mask === "string" && typeof riddle?.place === "string";
  });
}

export type PositionValidator = (panelId: string, x: number) => boolean;

function validPosition(value: unknown, validatePanel?: PositionValidator): value is RunPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Partial<RunPosition>;
  if (position.kind === "prologue_start") return true;
  if (position.kind !== "sideview") return false;
  if (typeof position.panelId !== "string" || !finite(position.x)) return false;
  if (position.facing !== -1 && position.facing !== 1) return false;
  return validatePanel ? validatePanel(position.panelId, position.x) : true;
}

function validRunShape(
  value: unknown, allowCheckpoint: boolean, validatePanel?: PositionValidator,
): value is RunSave {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<RunSave>;
  if (run.version !== 2 || typeof run.name !== "string" || !/^[A-Z]{4,8}$/.test(run.name)) return false;
  if (!finite(run.chapter) || !validPosition(run.position, validatePanel)) return false;
  if (!stringList(run.flags) || !stringList(run.knowledgeFlags) || !stringList(run.defeated)) return false;
  if (!pairs(run.grimoire) || !Array.isArray(run.unspoken) || !run.unspoken.every(finite)) return false;
  if (!riddlePairs(run.riddles)) return false;
  if (![run.hp, run.maxHp, run.mp, run.maxMp].every(finite)) return false;
  if ((run.maxHp ?? 0) <= 0 || (run.maxMp ?? 0) <= 0) return false;
  if ((run.hp ?? -1) < 0 || (run.hp ?? 0) > (run.maxHp ?? 0)) return false;
  if ((run.mp ?? -1) < 0 || (run.mp ?? 0) > (run.maxMp ?? 0)) return false;
  // v2初期版の保存には成長項目が無い。欠落だけはLv1の旧データとして移行する。
  if (run.level !== undefined && (!finite(run.level) || run.level < 1 || run.level > 5)) return false;
  if (run.xp !== undefined && (!finite(run.xp) || run.xp < 0 || run.xp > 210)) return false;
  if (run.weapons !== undefined && (!stringList(run.weapons) || run.weapons.some((id) => !validWeaponId(id)))) {
    return false;
  }
  if (
    run.equippedWeapon !== undefined
    && run.equippedWeapon !== null
    && (typeof run.equippedWeapon !== "string" || !validWeaponId(run.equippedWeapon))
  ) return false;
  if (!run.items || !finite(run.items.ink) || !finite(run.items.drop)) return false;
  if (run.items.ink < 0 || run.items.drop < 0) return false;
  if (typeof run.objective !== "string" || !run.objective.trim()) return false;

  if (run.checkpoint !== undefined) {
    if (!allowCheckpoint) return false;
    const checkpoint = run.checkpoint as Partial<EncounterCheckpoint>;
    if (typeof checkpoint.activeEncounterId !== "string" || !checkpoint.activeEncounterId) return false;
    if (!validRunShape(checkpoint.data, false, validatePanel)) return false;
  }
  return true;
}

export function decodeProfile(raw: string | null): ProfileSave {
  if (!raw) return emptyProfile();
  try {
    const value = JSON.parse(raw) as Partial<ProfileSave>;
    if (value.version !== 2 || !pairs(value.discoveredWords) || typeof value.cleared !== "boolean") {
      return emptyProfile();
    }
    return {
      version: 2,
      discoveredWords: value.discoveredWords,
      cleared: value.cleared,
      traces: Array.isArray(value.traces)
        ? value.traces.filter((trace): trace is string => typeof trace === "string")
        : undefined,
    };
  } catch {
    return emptyProfile();
  }
}

export function decodeRun(raw: string | null, validatePanel?: PositionValidator): RunSave | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validRunShape(value, true, validatePanel) ? normalizeRun(value) : null;
  } catch {
    return null;
  }
}

/** 同じv2キーを保ったまま、成長実装前の保存へ安全な初期値を補う。 */
function normalizeRun(value: RunSave): RunSave {
  const weapons = [...new Set(value.weapons ?? [])].filter(validWeaponId);
  const equippedWeapon = value.equippedWeapon && weapons.includes(value.equippedWeapon)
    ? value.equippedWeapon
    : null;
  const normalized: RunSave = {
    ...structuredClone(value),
    level: value.level ?? 1,
    xp: value.xp ?? 0,
    weapons,
    equippedWeapon,
  };
  if (value.checkpoint) {
    const checkpointRun = normalizeRun({ ...value.checkpoint.data, checkpoint: undefined });
    const { checkpoint: _checkpoint, ...data } = checkpointRun;
    normalized.checkpoint = { activeEncounterId: value.checkpoint.activeEncounterId, data };
  }
  return normalized;
}

export function loadProfile(): ProfileSave {
  try {
    return decodeProfile(localStorage.getItem(PROFILE_KEY));
  } catch (error) {
    console.warn("プロフィールを読み込めません", error);
    return emptyProfile();
  }
}

export function loadRun(validatePanel?: PositionValidator): RunSave | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    const run = decodeRun(raw, validatePanel);
    if (raw && !run) console.warn("進行データが壊れています。新規開始として扱います");
    return run;
  } catch (error) {
    console.warn("進行データを読み込めません", error);
    return null;
  }
}

function write(key: string, value: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    console.warn(`セーブに失敗しました: ${key}`, error);
    return { ok: false, message: "保存できませんでした" };
  }
}

export function saveProfile(profile: ProfileSave): SaveResult {
  return write(PROFILE_KEY, profile);
}

export function saveRun(run: RunSave): SaveResult {
  const result = write(RUN_KEY, run);
  if (!result.ok) return result;
  const profile = loadProfile();
  const words = new Map(profile.discoveredWords);
  for (const [id, word] of run.grimoire) words.set(id, word);
  const profileResult = saveProfile({ ...profile, discoveredWords: [...words] });
  return profileResult.ok ? result : profileResult;
}

export function clearRun(): SaveResult {
  try {
    localStorage.removeItem(RUN_KEY);
    return { ok: true };
  } catch (error) {
    console.warn("進行データを削除できません", error);
    return { ok: false, message: "進行データを消去できませんでした" };
  }
}

export function prologueRun(player: Player): RunSave {
  return {
    version: 2,
    name: player.name,
    chapter: 0,
    position: { kind: "prologue_start" },
    flags: [],
    knowledgeFlags: [],
    defeated: [],
    grimoire: [],
    unspoken: [],
    riddles: [],
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    level: player.level,
    xp: player.xp,
    weapons: [...player.ownedWeapons],
    equippedWeapon: player.equippedWeaponId,
    items: { ...player.items },
    objective: "十年前の記憶をたどる",
  };
}

export function sideViewRun(player: Player, state: SideViewState, chapter = 1): RunSave {
  const knowledgeFlags = [...state.flags].filter((flag) => flag.startsWith("knowledge:"));
  const storyFlags = [...state.flags].filter((flag) => !flag.startsWith("knowledge:"));
  return {
    version: 2,
    name: player.name,
    chapter,
    position: {
      kind: "sideview",
      panelId: state.panelId,
      x: state.x,
      facing: state.facing,
    },
    flags: storyFlags,
    knowledgeFlags,
    defeated: [...state.defeated],
    grimoire: [...player.grimoire],
    unspoken: [...player.unspoken],
    riddles: [...player.riddles],
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    level: player.level,
    xp: player.xp,
    weapons: [...player.ownedWeapons],
    equippedWeapon: player.equippedWeaponId,
    items: { ...player.items },
    objective: state.objective,
  };
}

export function applyRun(player: Player, run: RunSave): SideViewState | null {
  player.name = run.name;
  player.hp = run.hp;
  player.maxHp = run.maxHp;
  player.mp = run.mp;
  player.maxMp = run.maxMp;
  player.setProgression(run.xp, run.weapons, run.equippedWeapon);
  player.items = { ...run.items };
  player.grimoire = new Map(run.grimoire);
  player.unspoken = new Set(run.unspoken);
  player.riddles = new Map(run.riddles);
  if (run.position.kind !== "sideview") return null;
  return {
    panelId: run.position.panelId,
    x: run.position.x,
    facing: run.position.facing,
    flags: new Set([...run.flags, ...run.knowledgeFlags]),
    defeated: new Set(run.defeated),
    objective: run.objective,
  };
}

function checkpointData(run: RunSave): CheckpointData {
  const { checkpoint: _checkpoint, ...data } = structuredClone(run);
  return data;
}

export function withCheckpoint(run: RunSave, activeEncounterId: string): RunSave {
  return {
    ...structuredClone(run),
    checkpoint: { activeEncounterId, data: checkpointData(run) },
  };
}

/** 世界状態は巻き戻し、戦闘中に増えた知識だけを合わせる。 */
export function restoreCheckpoint(run: RunSave, activeEncounterId: string): RunSave | null {
  const checkpoint = run.checkpoint;
  if (!checkpoint || checkpoint.activeEncounterId !== activeEncounterId) return null;

  const restored: RunSave = { ...structuredClone(checkpoint.data) };
  const words = new Map(restored.grimoire);
  for (const [id, word] of run.grimoire) words.set(id, word);
  restored.grimoire = [...words];
  restored.unspoken = [...new Set([...restored.unspoken, ...run.unspoken])];
  const riddles = new Map(restored.riddles);
  for (const [id, riddle] of run.riddles) riddles.set(id, riddle);
  restored.riddles = [...riddles];
  restored.knowledgeFlags = [...new Set([...restored.knowledgeFlags, ...run.knowledgeFlags])];
  return restored;
}

export function profilePlayerWords(player: Player, profile: ProfileSave): void {
  player.grimoire = new Map(profile.discoveredWords);
}
