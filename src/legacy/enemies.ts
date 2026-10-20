import rawEnemies from "../../data/enemies.json";
import type { EnemyDef } from "../battle/model.ts";

/** DEV用のシリーズ1敵。通常bundleからはdevRuntimeごと除外する。 */
export const LEGACY_ENEMIES = (rawEnemies as unknown as { enemies: EnemyDef[] }).enemies;
