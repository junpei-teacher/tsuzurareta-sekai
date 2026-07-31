import { Display, SCREEN_W } from "../core/display.ts";
import type { Keyboard } from "../core/input.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import type { Player } from "../game/player.ts";
import { getMap, walkable, type GameMap, type MapEntity, type Tile } from "../field/mapFormat.ts";
import type { FieldState } from "../field/state.ts";
import type { ImageMap } from "../core/assets.ts";
import { BurnLayer, scorch } from "../fx/burn.ts";
import { saveProgress } from "../game/save.ts";
import { DialogueBox, speaker } from "../ui/dialogue.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { bar, windowBox } from "../ui/hud.ts";
import { ENEMIES } from "../battle/model.ts";

const TILE = 16;
const ORIGIN_X = 16;
const ORIGIN_Y = 26;
/** 1マス進むのにかかる秒数 */
const STEP_TIME = 0.15;
/**
 * スプライトの足元をマス下端からどれだけ下げるか。
 * PixelLab の出力はキャンバス内で少し浮いているので、その分を吸収する。
 */
const SPRITE_FOOT = 4;

const DIRS = {
  up: { x: 0, y: -1, key: "ArrowUp" },
  down: { x: 0, y: 1, key: "ArrowDown" },
  left: { x: -1, y: 0, key: "ArrowLeft" },
  right: { x: 1, y: 0, key: "ArrowRight" },
} as const;

type Dir = keyof typeof DIRS;

export class FieldScene implements Scene {
  private map: GameMap;
  private readonly dialogue = new DialogueBox();
  private readonly grimoire = new GrimoireView();
  private readonly burn = new BurnLayer();
  private grimoireOpen = false;

  /** 移動中の補間。0で静止 */
  private stepT = 0;
  private fromX = 0;
  private fromY = 0;
  private lastTalkedMira = false;
  private time = 0;
  private notice = "";
  private noticeT = 0;

  constructor(
    private readonly kb: Keyboard,
    private readonly player: Player,
    private readonly state: FieldState,
    private readonly images: ImageMap,
    private readonly onBattle: (enemyId: string, cellKey: string) => void,
    private readonly onVault: () => void,
    private readonly onExit: () => void,
  ) {
    this.map = getMap(state.mapId);
    this.fromX = state.x;
    this.fromY = state.y;
    saveProgress(player);

    // 章の入り口で一度だけ出す文章
    if (state.intro.length > 0) {
      this.dialogue.open({ name: "", color: PAL.ink, talks: [] }, state.intro);
      state.intro = [];
    }
  }

  /** 炎上中は色を焦がす（設計書 2.8） */
  private col(hex: string): string {
    return this.state.burning ? scorch(hex) : hex;
  }

  // ── 更新 ──────────────────────────────────

  update(dt: number, keys: string[]): void {
    this.time += dt;
    this.dialogue.update(dt);
    if (this.state.burning) this.burn.update(dt);
    if (this.noticeT > 0) this.noticeT -= dt;

    for (const key of keys) this.handleKey(key);

    if (this.dialogue.active || this.grimoireOpen) return;
    this.updateMovement(dt);
  }

  private handleKey(key: string): void {
    if (this.dialogue.active) {
      if (key === "Enter" || key === " ") {
        const done = this.dialogue.advance();
        if (done && this.lastTalkedMira) this.moveMira();
      }
      return;
    }
    if (this.grimoireOpen) {
      if (this.grimoire.handle(key, this.player)) this.grimoireOpen = false;
      return;
    }
    if (key === "Enter" || key === " ") this.interact();
    if (key === "Tab") { this.grimoireOpen = true; this.grimoire.reset(); }
    if (key === "Escape") this.onExit();
  }

  private updateMovement(dt: number): void {
    if (this.stepT > 0) {
      this.stepT = Math.max(0, this.stepT - dt / STEP_TIME);
      if (this.stepT === 0) this.onArrive();
      return;
    }

    let dir: Dir | null = null;
    for (const d of Object.keys(DIRS) as Dir[]) {
      if (this.kb.isDown(DIRS[d].key)) { dir = d; break; }
    }
    if (!dir) return;

    this.state.facing = dir;
    const nx = this.state.x + DIRS[dir].x;
    const ny = this.state.y + DIRS[dir].y;
    if (!this.canEnter(nx, ny)) return;

    this.fromX = this.state.x;
    this.fromY = this.state.y;
    this.state.x = nx;
    this.state.y = ny;
    this.stepT = 1;
  }

  private canEnter(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return false;
    // 第2章の瓦礫と、崩れて通れるようになったマス
    if (this.state.isBlocked(this.map.id, x, y)) return false;
    if (this.state.isOpened(this.map.id, x, y)) return true;
    if (!walkable(this.tileAt(x, y))) return false;
    // NPCは押しのけられない
    const npc = this.entityAt(x, y, "npc");
    if (npc && this.npcVisible(npc)) return false;
    // 張り紙・落書き・禁書の台は通り抜けられない
    if (this.entityAt(x, y, "sign")) return false;
    if (this.entityAt(x, y, "vault")) return false;
    return true;
  }

  private tileAt(x: number, y: number): Tile {
    return this.map.tiles[y]?.[x] ?? "#";
  }

  private entityAt(x: number, y: number, kind?: MapEntity["kind"]): MapEntity | undefined {
    return this.map.entities.find(
      (e) => e.x === x && e.y === y && (kind === undefined || e.kind === kind),
    );
  }

  /**
   * ミラは今いる部屋にしか現れない。
   * 炎上後は誰もいない——NPCの配置を読み込まない（設計書 2.8）。
   */
  private npcVisible(e: MapEntity): boolean {
    if (this.state.burning) return false;
    if (e.ref !== "mira") return true;
    return this.state.miraRoom === this.map.id;
  }

  private onArrive(): void {
    const { x, y } = this.state;

    // 崩れた階段。第3章へ降りる
    if (this.state.isOpened(this.map.id, x, y)) {
      this.state.startChapter(3, this.player);
      this.map = getMap(this.state.mapId);
      this.fromX = this.state.x;
      this.fromY = this.state.y;
      this.stepT = 0;
      if (this.state.intro.length > 0) {
        this.dialogue.open({ name: "", color: PAL.ink, talks: [] }, this.state.intro);
        this.state.intro = [];
      }
      return;
    }

    const door = this.entityAt(x, y, "door");
    if (door) {
      this.state.mapId = door.ref;
      this.state.x = door.toX ?? 1;
      this.state.y = door.toY ?? 1;
      this.map = getMap(door.ref);
      this.fromX = this.state.x;
      this.fromY = this.state.y;
      return;
    }

    const enemy = this.entityAt(x, y, "enemy");
    if (enemy) {
      const cellKey = `${this.map.id}:${x},${y}`;
      if (!this.state.defeated.has(cellKey)) this.onBattle(enemy.ref, cellKey);
    }
  }

  private interact(): void {
    const d = DIRS[this.state.facing];
    const tx = this.state.x + d.x;
    const ty = this.state.y + d.y;

    // 禁書。調べると書き込みへ
    if (this.entityAt(tx, ty, "vault")) {
      this.onVault();
      return;
    }

    const target =
      this.entityAt(tx, ty, "npc") ?? this.entityAt(tx, ty, "sign");
    if (!target) {
      // 目の前が本棚なら、それらしいことを言う
      const t = this.tileAt(tx, ty);
      if (t === "B") this.showNotice("背表紙の題名を、目録に書き写す。それが仕事だ。");
      else if (t === "C") this.showNotice("燭台。書庫でいちばん危険な道具。");
      else if (t === "V") this.showNotice("下へ続く階段。見習いは、ここから先へ行ってはいけない。");
      else if (t === "T") this.showNotice("写字机。天板が、いくつも傷んでいる。");
      return;
    }
    if (target.kind === "npc" && !this.npcVisible(target)) return;

    const sp = speaker(target.ref);
    if (!sp) return;
    const i = this.state.nextTalk(target.ref, sp.talks.length);
    const talk = [...(sp.talks[i] ?? [])];
    // ミラは巡回中。見つけた部屋によって、していることが違う
    const found = sp.found?.[this.map.id];
    if (found) talk.unshift(found);
    this.dialogue.open(sp, talk);
    this.lastTalkedMira = target.ref === "mira";
  }

  /** 会話のたびにミラは別の部屋へ移る */
  private moveMira(): void {
    const rooms = ["ch1_reading", "ch1_desks", "ch1_stacks", "ch1_stairs"]
      .filter((id) => id !== this.state.miraRoom);
    this.state.miraRoom = rooms[Math.floor(Math.random() * rooms.length)] ?? this.state.miraRoom;
    this.lastTalkedMira = false;
  }

  private showNotice(text: string): void {
    this.notice = text;
    this.noticeT = 2.6;
  }

  // ── 描画 ──────────────────────────────────

  render(d: Display): void {
    d.clear();

    d.text(this.map.name, 18, 8, this.state.burning ? "#e07a34" : PAL.accent);
    d.textRight("TAB 呪文帳　ENTER しらべる　ESC もどる", SCREEN_W - 16, 8, PAL.line);

    this.renderTiles(d);
    this.renderEntities(d);
    this.renderPlayer(d);
    if (this.state.burning) this.burn.render(d);
    this.renderStatus(d);

    if (this.noticeT > 0 && !this.dialogue.active) {
      windowBox(d, 16, 214, SCREEN_W - 32, 26);
      d.text(this.notice, 28, 220, PAL.dim);
    }

    this.dialogue.render(d);
    if (this.grimoireOpen) {
      this.grimoire.render(d, 16, 26, SCREEN_W - 32, 184, this.player);
      d.textRight("↑↓ 選択　ESC とじる", SCREEN_W - 20, 214, PAL.line);
    }
  }

  private renderTiles(d: Display): void {
    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) {
        this.drawTile(d, x, y, this.tileAt(x, y));
      }
    }
  }

  private drawTile(d: Display, x: number, y: number, t: Tile): void {
    const px = ORIGIN_X + x * TILE;
    const py = ORIGIN_Y + y * TILE;

    const c = (hex: string) => this.col(hex);

    switch (t) {
      case "#":
        d.rect(px, py, TILE, TILE, c("#2a231d"));
        d.rect(px, py, TILE, 2, c("#3d332a"));
        break;
      case ".":
        d.rect(px, py, TILE, TILE, c((x + y) % 2 === 0 ? "#1b1714" : "#191512"));
        break;
      case "B": {
        d.rect(px, py, TILE, TILE, c("#3b2a1c"));
        // 背表紙。座標から決まるので毎フレーム同じ
        for (let i = 0; i < 4; i++) {
          const seed = (x * 31 + y * 17 + i * 7) % 5;
          const cols = ["#6a4b33", "#7a5340", "#4f5f52", "#6b5f4d", "#5a4058"];
          d.rect(px + 2 + i * 3, py + 3, 2, 11, c(cols[seed]!));
        }
        d.rect(px, py + TILE - 2, TILE, 2, c("#241a11"));
        break;
      }
      case "T":
        d.rect(px, py, TILE, TILE, c("#4a3826"));
        d.rect(px, py, TILE, 3, c("#5c4832"));
        break;
      case "C": {
        d.rect(px + 5, py + 6, 6, 10, c("#4a4038"));
        const flick = 0.6 + 0.4 * Math.sin(this.time * 9 + x * 3 + y);
        d.ctx.globalAlpha = flick;
        d.rect(px + 7, py + 2, 2, 4, "#f0b83c");
        d.ctx.globalAlpha = flick * 0.25;
        d.rect(px + 2, py - 2, 12, 12, "#c8912f");
        d.ctx.globalAlpha = 1;
        break;
      }
      case "=":
        d.rect(px, py, TILE, TILE, c("#3a3028"));
        d.rect(px, py, TILE, 2, c("#4c4034"));
        break;
      case "V":
        d.rect(px, py, TILE, TILE, c("#221d19"));
        for (let i = 0; i < 4; i++) d.rect(px, py + i * 4, TILE, 1, c("#3a3129"));
        break;
    }

    // 焼け落ちた梁で塞がれたマス
    if (this.state.isBlocked(this.map.id, x, y)) {
      d.rect(px + 1, py + 4, TILE - 2, 5, "#4a2a18");
      d.rect(px + 3, py + 9, TILE - 7, 4, "#33200f");
      d.rect(px + 1, py + 4, TILE - 2, 1, "#7a3f20");
    }
  }

  private renderEntities(d: Display): void {
    for (const e of this.map.entities) {
      const px = ORIGIN_X + e.x * TILE;
      const py = ORIGIN_Y + e.y * TILE;

      if (e.kind === "door") {
        d.rect(px, py, TILE, TILE, "#120f0d");
        d.rect(px + 6, py + 6, 4, 4, PAL.accent);
        continue;
      }
      if (e.kind === "sign") {
        d.rect(px + 3, py + 3, 10, 10, "#8a8070");
        d.frame(px + 3, py + 3, 10, 10, "#241a11");
        d.rect(px + 5, py + 6, 6, 1, "#4a4038");
        d.rect(px + 5, py + 9, 6, 1, "#4a4038");
        continue;
      }

      if (e.kind === "vault") {
        // 台に置かれた、開かれたままの本
        const glow = 0.4 + 0.25 * Math.sin(this.time * 1.6);
        d.ctx.globalAlpha = glow * 0.5;
        d.rect(px - 4, py - 4, TILE + 8, TILE + 8, "#c8912f");
        d.ctx.globalAlpha = 1;
        d.rect(px + 1, py + 5, 14, 9, "#241d16");
        d.rect(px + 2, py + 6, 6, 7, "#d8cfb4");
        d.rect(px + 8, py + 6, 6, 7, "#d8cfb4");
        continue;
      }

      if (e.kind === "enemy") {
        if (this.state.defeated.has(`${this.map.id}:${e.x},${e.y}`)) continue;
        const def = ENEMIES.find((x) => x.id === e.ref);
        const bob = Math.round(Math.sin(this.time * 4 + e.x) * 1.5);
        d.rect(px + 2, py + 4 + bob, 12, 10, def?.sprite.color ?? "#7a3a34");
        d.frame(px + 2, py + 4 + bob, 12, 10, "#120f0d");
        continue;
      }

      if (!this.npcVisible(e)) continue;

      // ドット絵があれば使う。無ければ矩形のまま（Phase 7 は差し替え途中でも動く）
      const img = this.images[`${e.ref}.south`];
      if (img) {
        // 48x48 のキャンバスを、足元がマスの下端に来るように置く
        d.sprite(img, px + (TILE - img.width) / 2, py + TILE - img.height + SPRITE_FOOT);
        continue;
      }
      const sp = speaker(e.ref);
      d.rect(px + 3, py + 2, 10, 13, sp?.color ?? "#8a8a9a");
      d.rect(px + 3, py + 2, 10, 4, "#241a11");
    }
  }

  private renderPlayer(d: Display): void {
    // 移動中は前のマスから補間する
    const k = this.stepT;
    const gx = this.state.x + (this.fromX - this.state.x) * k;
    const gy = this.state.y + (this.fromY - this.state.y) * k;
    const px = Math.round(ORIGIN_X + gx * TILE);
    const py = Math.round(ORIGIN_Y + gy * TILE);

    d.rect(px + 3, py + 2, 10, 13, "#d8c8a0");
    d.rect(px + 3, py + 2, 10, 4, "#8a7a58");
    // 向きの目印
    const f = DIRS[this.state.facing];
    d.rect(px + 7 + f.x * 4, py + 8 + f.y * 5, 2, 2, "#3a2f22");
  }

  private renderStatus(d: Display): void {
    const p = this.player;
    d.text("HP", 18, 252, PAL.dim);
    bar(d, 40, 253, 90, 7, p.hp / p.maxHp, "#a8563f");
    d.text("MP", 146, 252, PAL.dim);
    bar(d, 168, 253, 90, 7, p.mp / p.maxMp, "#3f6fa8");
    d.textRight(`呪文帳 ${p.grimoire.size} 種　インク壺 ${p.items.ink}`, SCREEN_W - 16, 252, PAL.dim);
  }
}
