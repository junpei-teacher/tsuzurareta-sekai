import { Display, SCREEN_W } from "../core/display.ts";
import type { Keyboard } from "../core/input.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import type { Player } from "../game/player.ts";
import { getMap, walkable, type GameMap, type MapEntity, type Tile } from "../field/mapFormat.ts";
import type { FieldState } from "../field/state.ts";
import { WANG_SHELF, WANG_STONE, type WangTable } from "../field/tileset.ts";
import { frames, type ImageMap } from "../core/assets.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
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
/** 待機モーションの再生速度（1秒あたりのコマ数）。ゆっくりでいい */
const IDLE_FPS = 5;
/**
 * 歩行サイクルの再生速度。
 * 1マス0.15秒なので、4フレームなら約6.7fpsで1マス1周する。
 * 足が地面を滑らないよう、この2つは揃えておく。
 */
const WALK_FPS = 6.7;

const DIRS = {
  up: { x: 0, y: -1, key: "ArrowUp" },
  down: { x: 0, y: 1, key: "ArrowDown" },
  left: { x: -1, y: 0, key: "ArrowLeft" },
  right: { x: 1, y: 0, key: "ArrowRight" },
} as const;

type Dir = keyof typeof DIRS;

/** 内部の向き名 → アセットの方位名。PixelLab の出力が方位で並ぶため */
const COMPASS: Record<Dir, string> = {
  up: "north",
  down: "south",
  left: "west",
  right: "east",
};

export class FieldScene implements Scene {
  private map: GameMap;
  private readonly dialogue = new DialogueBox();
  private readonly grimoire = new GrimoireView();
  private readonly burn = new BurnLayer();
  private readonly bloom = new BloomLayer();
  private grimoireOpen = false;

  /** 移動中の補間。0で静止 */
  private stepT = 0;
  private fromX = 0;
  private fromY = 0;
  private lastTalkedMira = false;
  /** 歩行サイクルの位相。歩いているあいだだけ進む */
  private walkPhase = 0;
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
    this.bloom.update(dt);
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
      this.walkPhase += dt;
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
    // 光は絵の上、UIの下。燭台のにじみと床の光だまりがここで乗る
    this.bloom.render(d, this.collectLights(), this.state.burning ? 0.10 : 0.05,
      this.state.burning ? "#e07a34" : "#c8792f");
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
    const stone = this.images["tiles.stone"];
    if (!stone) {
      // タイルセット未投入のあいだは手描きの矩形で全部描く
      for (let y = 0; y < this.map.h; y++) {
        for (let x = 0; x < this.map.w; x++) {
          this.drawTile(d, x, y, this.tileAt(x, y));
        }
      }
      return;
    }

    // 1層目：石床と石壁を全面に敷く
    this.renderWang(d, stone, WANG_STONE, (t) => t === "#", false);

    // 2層目：本棚。全て床の組み合わせ（index 0）は描かない
    const shelf = this.images["tiles.shelf"];
    if (shelf) this.renderWang(d, shelf, WANG_SHELF, (t) => t === "B", true);
    else this.forEachTile("B", (x, y) => this.drawTile(d, x, y, "B"));

    // 3層目：家具のスプライト
    this.renderProps(d);
  }

  /** 指定タイルのマスを走査する */
  private forEachTile(tile: Tile, fn: (x: number, y: number) => void): void {
    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) if (this.tileAt(x, y) === tile) fn(x, y);
    }
  }

  /**
   * Wang タイル層（設計書 7.4 / src/field/tileset.ts）。
   *
   * タイルセットは「頂点」で地形を定義するが、本作のマップは「マス」で持っている。
   * そこで**マスの中心を頂点とみなし、タイルを半マスずらして描く**。
   * こうすると境界がマスの境界に乗り、当たり判定と絵が一致する。
   * 画面端は外側を upper とみなして1枚はみ出して描く。
   *
   * @param skipEmpty 4隅すべてが lower のとき描かない。重ね貼りする層で使う
   */
  private renderWang(
    d: Display,
    sheet: HTMLImageElement,
    table: WangTable,
    isUpper: (t: Tile) => boolean,
    skipEmpty: boolean,
  ): void {
    const at = (x: number, y: number): number => {
      if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return skipEmpty ? 0 : 1;
      return isUpper(this.tileAt(x, y)) ? 1 : 0;
    };

    for (let y = -1; y < this.map.h; y++) {
      for (let x = -1; x < this.map.w; x++) {
        const idx =
          at(x, y) * 8 + at(x + 1, y) * 4 + at(x, y + 1) * 2 + at(x + 1, y + 1);
        if (skipEmpty && idx === 0) continue;
        const r = table[idx];
        if (!r) continue;
        d.spriteRect(
          sheet, r.sx, r.sy, r.w, r.h,
          ORIGIN_X + x * TILE + TILE / 2,
          ORIGIN_Y + y * TILE + TILE / 2,
        );
      }
    }
  }

  /** 家具のスプライト。無いものは手描きの矩形に落ちる */
  /**
   * この部屋の光源を集める。
   * 燭台が主光源。第2章では床のあちこちが燃えているので、光が増えて赤く寄る。
   */
  private collectLights(): Light[] {
    const out: Light[] = [];
    this.forEachTile("C", (x, y) => {
      out.push({
        x: ORIGIN_X + x * TILE + TILE / 2,
        y: ORIGIN_Y + y * TILE - 2,
        radius: 44,
        strength: 0.55,
        color: "#f0b83c",
      });
    });
    // 禁書は自分で光っている
    for (const e of this.map.entities) {
      if (e.kind !== "vault") continue;
      out.push({
        x: ORIGIN_X + e.x * TILE + TILE / 2,
        y: ORIGIN_Y + e.y * TILE + TILE / 2,
        radius: 60,
        strength: 0.45,
        color: "#c8912f",
      });
    }
    return out;
  }

  private renderProps(d: Display): void {
    // 写字机は2マス幅。横に連なるマスの先頭から2マスおきに置く
    const desk = this.images["prop.desk"];
    for (let y = 0; y < this.map.h; y++) {
      let runStart = -1;
      for (let x = 0; x <= this.map.w; x++) {
        const isDesk = x < this.map.w && this.tileAt(x, y) === "T";
        if (isDesk && runStart < 0) runStart = x;
        if (!isDesk && runStart >= 0) {
          // 上の段にも机があるなら、そちらが先頭。ここでは描かない
          if (this.tileAt(runStart, y - 1) !== "T") {
            for (let i = runStart; i < x; i += 2) {
              // 64pxの机は2マス分。デザイン単位では TILE*2 に収まる
              if (desk) d.sprite(desk, ORIGIN_X + i * TILE, ORIGIN_Y + y * TILE - 2);
              else d.rect(ORIGIN_X + i * TILE, ORIGIN_Y + y * TILE, TILE * 2, TILE * 2, this.col("#4a3826"));
            }
          }
          runStart = -1;
        }
      }
    }

    // 燭台。炎だけは手描きのまま重ねる。ゆらぐほうが書庫に合う
    const candle = this.images["prop.candle"];
    this.forEachTile("C", (x, y) => {
      const px = ORIGIN_X + x * TILE;
      const py = ORIGIN_Y + y * TILE;
      if (candle) d.sprite(candle, px + TILE / 2 - candle.width / 2, py + TILE - candle.height + 4);
      const flick = 0.6 + 0.4 * Math.sin(this.time * 9 + x * 3 + y);
      d.ctx.globalAlpha = flick;
      d.rect(px + 7, py - 12, 2, 4, "#f0b83c");
      d.ctx.globalAlpha = flick * 0.22;
      d.rect(px - 2, py - 18, 20, 22, "#c8912f");
      d.ctx.globalAlpha = 1;
    });

    // 階段。塊の中心に1枚置く
    const stairs = this.images["prop.stairs"];
    if (stairs) {
      let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
      this.forEachTile("V", (x, y) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
      if (maxX >= 0) {
        const cx = ORIGIN_X + ((minX + maxX + 1) * TILE) / 2;
        const cy = ORIGIN_Y + ((minY + maxY + 1) * TILE) / 2;
        d.sprite(stairs, cx - stairs.width / 2, cy - stairs.height / 2);
      }
    } else {
      this.forEachTile("V", (x, y) => this.drawTile(d, x, y, "V"));
    }

    // カウンターは手描きのまま
    this.forEachTile("=", (x, y) => this.drawTile(d, x, y, "="));

    // 第2章で塞がれたマスに落ちた梁を置く
    if (this.state.burning) {
      const rubble = this.images["prop.rubble"];
      for (let y = 0; y < this.map.h; y++) {
        for (let x = 0; x < this.map.w; x++) {
          if (!this.state.isBlocked(this.map.id, x, y)) continue;
          const px = ORIGIN_X + x * TILE;
          const py = ORIGIN_Y + y * TILE;
          if (rubble) d.sprite(rubble, px + TILE / 2 - rubble.width / 2, py + TILE - rubble.height + 4);
          else {
            d.rect(px + 1, py + 4, TILE - 2, 5, "#4a2a18");
            d.rect(px + 3, py + 9, TILE - 7, 4, "#33200f");
          }
        }
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

  }

  private renderEntities(d: Display): void {
    for (const e of this.map.entities) {
      const px = ORIGIN_X + e.x * TILE;
      const py = ORIGIN_Y + e.y * TILE;

      if (e.kind === "door") {
        const img = this.images["prop.door"];
        if (img) {
          d.sprite(img, px + TILE / 2 - img.width / 2, py + TILE - img.height + 6);
        } else {
          d.rect(px, py, TILE, TILE, "#120f0d");
          d.rect(px + 6, py + 6, 4, 4, PAL.accent);
        }
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

      // 待機モーションがあれば再生。無ければ静止画。どちらも無ければ矩形
      // （Phase 7 は差し替え途中でも動くようにしておく）
      const loop = frames(this.images, `${e.ref}.idle`);
      // NPCごとに位相をずらす。並んだときに同じ動きで揃うと不自然
      const phase = (e.x * 7 + e.y * 13) % 97;
      const img = loop.length > 0
        ? loop[Math.floor(this.time * IDLE_FPS + phase) % loop.length]
        : this.images[`${e.ref}.south`];
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

    const dir = this.state.facing;
    const compass = COMPASS[dir];
    const walk = frames(this.images, `hero.walk.${compass}`);
    // 歩行サイクルは歩いているあいだだけ進む。止まれば立ち姿に戻る
    const img = this.stepT > 0 && walk.length > 0
      ? walk[Math.floor(this.walkPhase * WALK_FPS) % walk.length]
      : this.images[`hero.${compass}`] ?? walk[0];

    if (img) {
      d.sprite(img, px + (TILE - img.width) / 2, py + TILE - img.height + SPRITE_FOOT);
      return;
    }

    // アセット未投入のあいだは矩形（Phase 7 は差し替え途中でも動く）
    d.rect(px + 3, py + 2, 10, 13, "#d8c8a0");
    d.rect(px + 3, py + 2, 10, 4, "#8a7a58");
    const f = DIRS[dir];
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
