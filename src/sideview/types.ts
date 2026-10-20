import type { ThemeId } from "../core/theme.ts";
import type { Player } from "../game/player.ts";

export type FlagGate = {
  allFlags?: string[];
  noneFlags?: string[];
};

export type DialogueAction = FlagGate & {
  id: string;
  x: number;
  label: string;
  dialogue: string;
  setFlags?: string[];
  /** 会話・調査で確実に教わる固定綴り。 */
  learnWords?: string[];
  /** 焚き火や章前の休息。明示した調査時だけHP・MPを全回復する。 */
  restore?: boolean;
  /** 欠けた綴りを呪文帳の控えへ写す。 */
  riddles?: Array<{ spellId: number; mask: string; place: string }>;
  /** 会話完了後に単一エンディングSceneへ移る。 */
  ending?: boolean;
  objective?: string;
};

export type ActorKind = "keeper" | "villager" | "hunter" | "merchant" | "guardian" | "sena";
export type ActorDef = DialogueAction & {
  kind: ActorKind;
  facing?: -1 | 1;
};

export type InteractableDef = DialogueAction;

export type EncounterDef = DialogueAction & {
  enemy: string;
  automatic?: boolean;
  /** ボスなどが初回勝利時に落とす一枠武器。 */
  rewardWeapon?: string;
  winFlags?: string[];
  winObjective?: string;
};

export type ExitDef = FlagGate & {
  to: string;
  spawn: number;
};

export type BlockDef = FlagGate & { min: number; max: number };

export type BackgroundDef = {
  renderer:
    | "storehouse" | "road" | "gate" | "forestBoundary" | "shallowForest"
    | "deepForest" | "ruinExterior" | "ruinInterior";
  far: string;
  middle: string;
  foreground: string;
};

export type PanelDef = {
  id: string;
  chapter: number;
  theme: ThemeId;
  music: string;
  groundY: number;
  background: BackgroundDef;
  walk: { min: number; max: number };
  spawn: number;
  blocks: BlockDef[];
  leftExit?: ExitDef;
  rightExit?: ExitDef;
  actors: ActorDef[];
  interactables: InteractableDef[];
  encounters: EncounterDef[];
  objective: string;
};

export type DialoguePart = { name: string; color: string; lines: string[] };
export type DialogueTable = Record<string, DialoguePart[]>;

export type SideViewState = {
  panelId: string;
  x: number;
  facing: -1 | 1;
  flags: Set<string>;
  defeated: Set<string>;
  objective: string;
};

export type SideViewContext = {
  player: Player;
  state: SideViewState;
};

export function gateOpen(gate: FlagGate, flags: ReadonlySet<string>): boolean {
  return (gate.allFlags ?? []).every((flag) => flags.has(flag))
    && (gate.noneFlags ?? []).every((flag) => !flags.has(flag));
}
