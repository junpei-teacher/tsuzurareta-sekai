import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { Battle, ENEMIES, spawn } from "../src/battle/model.ts";
import { Player } from "../src/game/player.ts";
import { getGameRules } from "../src/game/rules.ts";
import { allSpells } from "../src/spell/book.ts";
import { resolveSpell } from "../src/spell/resolver.ts";

// 実際に編集するHTMLの設定を、そのまま読み込んで戦闘を検証する。
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
const browser = { GAME_RULES: undefined as Window["GAME_RULES"] };
runInNewContext(script, { window: browser });
Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
assert.deepEqual(getGameRules(), { damageMultiplier: 1, infiniteMp: false });

const dummy = ENEMIES.find((e) => e.dummy)!;
const enemy = ENEMIES.find((e) => !e.dummy && !e.immune.includes("FIRE"))!;
function damage(): number {
  const battle = new Battle(new Player(), spawn(dummy));
  assert.equal(battle.cast("ROZHA").kind, "CAST");
  return dummy.hp - battle.enemy.hp;
}
const normal = damage();
assert.ok(normal > 0);
browser.GAME_RULES = { damageMultiplier: 100, infiniteMp: false };
assert.equal(damage(), normal * 100);
const strong = new Battle(new Player(), spawn(enemy));
strong.cast("ROZHA");
assert.equal(strong.enemy.hp, 0, "100倍で序盤の敵を一撃で倒せる");

browser.GAME_RULES = { infiniteMp: true };
const player = new Player();
player.mp = 0;
const free = new Battle(player, spawn(enemy));
assert.equal(free.cast("ROZHA").kind, "CAST");
assert.equal(player.mp, 0);
const dud = Array.from({ length: 1000 }, (_, i) => `TEST${i}`)
  .find((word) => resolveSpell(word).tier === "DUD")!;
assert.ok(dud);
player.mp = 10;
assert.equal(free.cast(dud).kind, "DUD");
assert.equal(player.mp, 10, "不発でもMPを消費しない");

browser.GAME_RULES = { damageMultiplier: 1, infiniteMp: false };
assert.equal(damage(), normal, "設定を戻すと元のダメージに戻る");
player.mp = 0;
assert.equal(new Battle(player, spawn(enemy)).cast("ROZHA").kind, "REFUSED");
player.mp = 90;
player.statuses = [{ kind: "MP_HALF", turns: 2 }];
new Battle(player, spawn(enemy)).cast("ROZHA");
assert.equal(player.mp, 90 - Math.ceil(allSpells().find((s) => s.id === 20)!.mp / 2));
player.mp = 10;
new Battle(player, spawn(enemy)).cast(dud);
assert.equal(player.mp, 7, "通常設定では不発でMPを3消費する");

for (const value of [NaN, Infinity, -1, 0, 1_000_001, "100"]) {
  browser.GAME_RULES = { damageMultiplier: value as number };
  assert.equal(getGameRules().damageMultiplier, 1);
}
browser.GAME_RULES = undefined;
assert.deepEqual(getGameRules(), { damageMultiplier: 1, infiniteMp: false });
Reflect.deleteProperty(globalThis, "window");
assert.deepEqual(getGameRules(), { damageMultiplier: 1, infiniteMp: false });
console.log("ルール改変の検証OK：100倍・MP無限・通常設定への復帰・無効値");
