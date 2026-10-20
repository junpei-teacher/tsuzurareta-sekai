import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { TIER_COLOR } from "../core/palette.ts";
import { sfx } from "../core/sfx.ts";
import type { Tier } from "../spell/resolver.ts";
import { clamp01, easeOutCubic, easeOutQuint, makeRng, pulse, seg } from "./easing.ts";

/**
 * 詠唱演出。
 *
 * 設計方針：
 * - 閃光だけでは軽い。**溜め（暗転と静止）→ 炸裂 → 残光** の順で構成する
 * - レア以上は「光り輝く」。放射光線・拡散リング・粒子の3点セット
 * - 神話級は1周に一度あるかないかの瞬間なので、2.8秒を使い切ってよい
 * - ただし戦闘で同じ呪文を繰り返し撃つときは短縮版にする（後述の short）
 *
 * 素材は使わない。すべて Canvas の矩形と三角形で描く。
 */

type Spark = {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  /** 個別の色。指定が無ければ属性の色 */
  col?: string;
  /** 横ゆれの位相。指定があるとゆらゆら昇る（火の粉） */
  wob?: number;
  /** ちらつく（火の粉） */
  flick?: boolean;
  /** 落下と抵抗の上書き。破片だけ別の物理で動かす */
  grav?: number;
  drag?: number;
};

/**
 * 氷の板。出てきて、割れる。
 * 割れた瞬間に消えて、代わりに破片（Spark）が降る。
 */
type Plate = {
  x: number; y: number;
  w: number; h: number;
  rot: number;
  /** 出そろうまでの遅れ（0-1） */
  delay: number;
};

/** 稲妻。上から落ちて、数フレームだけ光る */
type Bolt = {
  pts: Array<{ x: number; y: number }>;
  /** 枝分かれ。無いこともある */
  branch: Array<{ x: number; y: number }> | null;
  life: number;
  maxLife: number;
};

/** 帯ごとの演出の長さ（秒） */
const DURATION: Record<Tier, number> = {
  // 不発だけは伸ばさない。**外したことを長く見せる意味がない**
  DUD: 0.40,
  COMMON: 0.75,
  UNCOMMON: 1.15,
  RARE: 1.95,
  // 神話はもともと溜めを持っているので 1.2 倍で足りる。
  // 4秒を超えると、1周に一度の見せ場でも長い
  MYTH: 3.40,
};

/**
 * 短縮版の倍率。戦闘で撃ち慣れた呪文はここまで縮める。
 * 尺を1.5倍にしたぶん、ここは少し上げた（0.42 だと繰り返しが素っ気なくなる）
 */
const SHORT_SCALE = 0.50;

/**
 * 属性ごとの見え方。
 *
 * **帯と属性で役割を分ける。**
 *   帯（tier）  … 尺・粒の数・揺れ・暗転の深さ ＝ どれくらい強いか
 *   属性        … 色・粒の動き方 ＝ 何の魔法か
 *
 * こうしておくと 6属性 × 4帯 の見え方が、表2つで出る。
 * 逆に属性ごとに演出を書き下ろすと 57種ぶん必要になり、この作品の身の丈を超える。
 *
 * 拡散リングだけは**帯色のまま**にしてある。粒の色で属性が、輪の色で帯が読める。
 */
export type FxElement = "FIRE" | "ICE" | "BOLT" | "NAME" | "HEAL" | "NONE";

type Motion =
  | "burst"    // 中心から放射する
  | "rise"     // 下から立ちのぼる
  | "converge" // 外から中心へ集まる
  | "streak";  // 一瞬で走り抜ける

type ElementFx = {
  color: string;
  /**
   * 演出の組み立て方。
   *   particles … 一度に撒いて、あとは飛ばすだけ
   *   ember     … 下から**出し続ける**。ちらつきながら昇る（火）
   *   shatter   … 板が出てきて、割れて、破片が降る（氷）
   *   strike    … 予兆 → 落雷 → 着弾の火花（雷）
   *   seal      … 刻み目の輪が回りながら縮み、**印が押されて沈む**（名）
   *
   * **段取りを持つのは火と氷だけでよい。** 全属性に段取りを付けると、
   * 撃つたびに芝居を見せられることになって、戦闘の速さが死ぬ。
   */
  kind: "particles" | "ember" | "shatter" | "strike" | "seal";
  motion: Motion;
  /** 落下の強さ。負なら浮き上がる（px/s²） */
  gravity: number;
  /** 空気抵抗。大きいほど早く止まる */
  drag: number;
  speed: [number, number];
  life: [number, number];
  /** 粒の数の倍率。帯が決めた数にこれを掛ける */
  count: number;
  /**
   * 演出の起点。既定は敵（画面中央上）。
   *
   * `self` は**自分に起きたこと**を表す。敵の位置では出さない。
   * 一度そうしていて、遊んだ人に「敵が回復したのかと思った」と言われている。
   * 画面の両端と全体で見せると、こちら側の出来事に見える
   */
  origin?: "self";
};

const ELEMENT: Record<FxElement, ElementFx> = {
  // 下からメラメラと立ちのぼる。粒はちらつき、横に揺れ、燃え尽きて小さくなる
  FIRE:  { color: "#e8833a", kind: "ember",     motion: "rise",     gravity: -30, drag: 1.1, speed: [34, 96],  life: [0.30, 0.80], count: 1.0 },
  // 板が出て、割れて、粉が落ちる
  ICE:   { color: "#9fd8ec", kind: "shatter",   motion: "burst",    gravity: 210, drag: 0.5, speed: [30, 120], life: [0.45, 0.85], count: 1.0 },
  // 予兆があって、落ちて、跳ねる
  BOLT:  { color: "#f2e07a", kind: "strike",    motion: "streak",   gravity: 90,  drag: 1.2, speed: [120, 260], life: [0.14, 0.42], count: 0.7 },
  // 輪が縮み、印が押されて沈む
  NAME:  { color: "#e0c060", kind: "seal",      motion: "converge", gravity: 0,   drag: 1.0, speed: [70, 150],  life: [0.35, 0.75], count: 0.9 },
  // 画面の両端から、ゆっくり昇る
  HEAL:  { color: "#7fd48a", kind: "particles", motion: "rise",     gravity: -34, drag: 0.9, speed: [22, 60],  life: [0.80, 1.60], count: 1.8, origin: "self" },
  // 色を持たない。白く抜ける
  NONE:  { color: "#d8d2c4", kind: "particles", motion: "burst",    gravity: 12,  drag: 1.6, speed: [30, 110], life: [0.30, 0.80], count: 0.8 },
};

/** 火の粉の焼け具合。近いほど白く、離れるほど暗い炭になる */
const EMBER_COLORS = ["#fbe6a0", "#f7c256", "#ef9440", "#d2632c", "#944021"];

/** 氷の板の色（表・縁） */
const ICE_PLATE = "#bfe8f5";
const ICE_EDGE = "#ffffff";

export class CastFx {
  private tier: Tier = "DUD";
  private element: FxElement = "NONE";
  private word = "";
  private t = 0;
  private dur = 0;
  private active = false;
  private short = false;
  private rng: () => number = makeRng(1);
  private sparks: Spark[] = [];
  private sparksSpawned = false;
  private locked = false;
  /** 氷の板。割れると空になる */
  private plates: Plate[] = [];
  /** 板を割ったか（一度だけ） */
  private shattered = false;
  /** 落ちた稲妻 */
  private bolts: Bolt[] = [];
  /** 何本目まで落としたか */
  private struck = 0;
  /** 印を押したか（一度だけ） */
  private sealed = false;
  /** 火の粉を出し続けるための端数。1を超えたぶんだけ生む */
  private emitAcc = 0;
  private shakeX = 0;
  private shakeY = 0;

  get isActive(): boolean {
    return this.active;
  }

  /**
   * 炸裂までの残り秒。演出中でなければ 0。
   *
   * 命中の音をここまで遅らせるために使う。神話級は**1.3秒ためてから炸裂する**ので、
   * ダメージが確定した瞬間に当たった音を鳴らすと、
   * 静かな溜めの途中で「当たった」音だけが先に鳴ってしまう。
   */
  get burstIn(): number {
    if (!this.active || this.locked) return 0;
    const at = this.tier === "MYTH" ? 0.46 : this.tier === "RARE" ? 0.12 : 0;
    return Math.max(0, at * this.dur - this.t);
  }

  /** 画面全体に適用する揺れ量 */
  get shake(): { x: number; y: number } {
    return { x: this.shakeX, y: this.shakeY };
  }

  /**
   * 演出を開始する。
   * @param hash 呪文のハッシュ。粒子の飛び方の種に使う（同じ言葉は同じ光になる）
   * @param short 撃ち慣れた呪文の短縮版にするか
   * @param element 属性。色と粒の動き方を決める。音も回復だけ変わる
   */
  play(tier: Tier, word: string, hash: number, short = false, element: FxElement = "NONE"): void {
    this.begin(tier, word, hash, short, element);
    // 音は光と同じ長さで鳴らす。炸裂の時刻もこの尺から割り出される
    sfx.cast(tier, this.dur, { heal: element === "HEAL" });
  }

  /** 光の初期化だけ。音は呼び出し側が鳴らす（不発と「届かない」で音が違うため） */
  private begin(tier: Tier, word: string, hash: number, short: boolean, element: FxElement = "NONE"): void {
    this.tier = tier;
    // 不発は属性を持たない。**掘り当てた色で光らせてはいけない**
    this.element = tier === "DUD" ? "NONE" : element;
    this.word = word;
    this.short = short;
    this.locked = false;
    this.t = 0;
    this.dur = DURATION[tier] * (short ? SHORT_SCALE : 1);
    this.active = true;
    this.rng = makeRng(hash);
    this.sparks = [];
    this.plates = [];
    this.shattered = false;
    this.bolts = [];
    this.struck = 0;
    this.sealed = false;
    this.emitAcc = 0;
    // 神話級は溜めの静けさを守るため、炸裂の瞬間まで粒子を出さない
    this.sparksSpawned = false;
    if (tier !== "MYTH") {
      this.sparksSpawned = true;
      this.spawnSparks();
    }
  }

  /** 段取りの時計。神話級は溜めが終わってから 0 になる */
  private get phase(): number {
    const burstAt = this.tier === "MYTH" ? 0.46 : 0;
    return clamp01((this.t / this.dur - burstAt) / (1 - burstAt));
  }

  /** 帯ごとの規模。中級を 1 とする */
  private get scale(): number {
    const s =
      this.tier === "MYTH" ? 3.2 :
      this.tier === "RARE" ? 2.0 :
      this.tier === "UNCOMMON" ? 1.0 :
      this.tier === "COMMON" ? 0.6 : 0;
    return s * (this.short ? 0.6 : 1);
  }

  /**
   * 掘り当てたがMPが足りず唱えられなかったときの演出（設計書 3.6）。
   * 文字は闇の中に浮かび上がるが、**炸裂しない**。そのまま消える。
   * 「知っている。だが、まだ届かない。」
   */
  playLocked(tier: Tier, word: string, hash: number): void {
    this.begin(tier, word, hash, false);
    this.locked = true;
    this.tier = "MYTH";      // 溜めと文字浮かび上がりの演出を借りる
    this.dur = 2.2;
    this.sparksSpawned = true; // 粒子は出さない
    this.sparks = [];
    // 唸りだけが立ち上がって、鳴りきらずに引く
    sfx.cast(tier, this.dur, { locked: true });
  }

  private spawnSparks(): void {
    const count =
      this.tier === "MYTH" ? 90 :
      this.tier === "RARE" ? 44 :
      this.tier === "UNCOMMON" ? 16 :
      this.tier === "COMMON" ? 8 : 0;
    if (count === 0) return;

    const cx = this.tier === "MYTH" ? SCREEN_W / 2 : 240;
    const cy = this.tier === "MYTH" ? SCREEN_H / 2 : 84;

    const e = ELEMENT[this.element];
    // 段取りを持つ属性は、ここでは撒かない。update が時計を見て出す
    if (e.kind === "ember" || e.kind === "strike" || e.kind === "seal") return;
    if (e.kind === "shatter") { this.spawnPlates(cx, cy); return; }
    const big = this.tier === "MYTH" ? 1.9 : 1; // 神話だけ遠くまで飛ばす
    const total = Math.round(count * e.count * (this.short ? 0.5 : 1));

    for (let i = 0; i < total; i++) {
      const a = this.rng() * Math.PI * 2;
      const speed = (e.speed[0] + this.rng() * (e.speed[1] - e.speed[0])) * big;
      // 粒が消えるまで演出は終わらない。撃ち慣れた呪文は**寿命も縮める**。
      // 縮めないと、癒し（寿命1.6秒）を連打したときに毎回1秒以上待たされる
      const life = (e.life[0] + this.rng() * (e.life[1] - e.life[0])) * (this.short ? 0.6 : 1);
      const s: Spark = {
        x: cx, y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed * 0.7,
        life, maxLife: life,
        size: this.rng() < 0.2 ? 2 : 1,
      };

      switch (e.motion) {
        case "rise": {
          if (e.origin === "self") {
            // **画面の両端から立ちのぼる。** 敵のいる中央には出さない。
            // 会話窓（y=136 から）に文字が隠れないよう、上端 132 までで止める
            const right = this.rng() < 0.5;
            s.x = right ? SCREEN_W - 4 - this.rng() * 52 : 4 + this.rng() * 52;
            s.y = 118 + this.rng() * 16;
            s.vx = (this.rng() - 0.5) * 8;
            s.vy = -speed;
          } else {
            // 足元の帯から立ちのぼる。横には広がらない
            s.x = cx + (this.rng() - 0.5) * 84 * big;
            s.y = cy + 26 + this.rng() * 16;
            s.vx = (this.rng() - 0.5) * 14;
            s.vy = -speed;
          }
          break;
        }
        case "converge": {
          // 外から中心へ。**寿命で中心に着く**ので、集まって消えるように見える
          const r = 60 + this.rng() * 60 * big;
          s.x = cx + Math.cos(a) * r;
          s.y = cy + Math.sin(a) * r * 0.7;
          s.vx = -Math.cos(a) * (r / life);
          s.vy = -Math.sin(a) * (r * 0.7 / life);
          break;
        }
        case "streak": {
          // ほぼ水平に走り抜ける。線に見せるため縦のぶれを潰す
          s.vy = Math.sin(a) * speed * 0.18;
          s.size = this.rng() < 0.5 ? 2 : 1;
          break;
        }
        case "burst":
          break;
      }
      this.sparks.push(s);
    }
  }

  /**
   * 火の粉をひと粒。**下から出し続ける**ので、一度に撒く粒子とは別扱いになる。
   * ちらつき（flick）と横ゆれ（wob）が「メラメラ」の正体で、
   * 上へ行くほど小さく暗くなることで燃え尽きて見える。
   */
  private emitEmber(cx: number, cy: number): void {
    const sc = this.scale;
    const life = (0.32 + this.rng() * 0.52) * (this.short ? 0.7 : 1);
    const spread = 40 + 26 * sc;
    this.sparks.push({
      x: cx + (this.rng() - 0.5) * spread,
      y: cy + 24 + this.rng() * 14,
      vx: (this.rng() - 0.5) * 10,
      vy: -(30 + this.rng() * 62) * (0.7 + sc * 0.3),
      life, maxLife: life,
      size: this.rng() < 0.35 ? 2 : 1,
      col: EMBER_COLORS[(this.rng() * EMBER_COLORS.length) | 0] ?? "#f7c256",
      wob: this.rng() * Math.PI * 2,
      flick: true,
    });
  }

  /** 氷の板を数枚、的の周りに立てる。割れるまで動かない */
  private spawnPlates(cx: number, cy: number): void {
    const n = Math.max(2, Math.round(3 * this.scale));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rng() * 0.6;
      const r = 8 + this.rng() * 22;
      this.plates.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * 0.6,
        w: 10 + this.rng() * 16 * this.scale,
        h: 20 + this.rng() * 26 * this.scale,
        rot: (this.rng() - 0.5) * 0.9,
        delay: (i / n) * 0.45,
      });
    }
  }

  /**
   * 板を割る。**パリーンと鳴る一瞬**で、板は全部消えて破片に変わる。
   * 破片は落ちる（属性の gravity が正なのはこのため）。
   */
  private shatterPlates(): void {
    for (const pl of this.plates) {
      // 粉々に見せたいので、板1枚あたりの破片は多めに割る
      const bits = Math.round(10 + this.rng() * 10 * this.scale);
      for (let i = 0; i < bits; i++) {
        const life = (0.4 + this.rng() * 0.5) * (this.short ? 0.6 : 1);
        this.sparks.push({
          x: pl.x + (this.rng() - 0.5) * pl.w,
          y: pl.y + (this.rng() - 0.5) * pl.h,
          // 横へ弾けて、すぐ落ちる
          vx: (this.rng() - 0.5) * 150,
          vy: -20 - this.rng() * 60,
          life, maxLife: life,
          size: this.rng() < 0.3 ? 2 : 1,
          col: this.rng() < 0.25 ? ICE_EDGE : ICE_PLATE,
        });
      }
    }
    this.plates = [];
  }

  /** 稲妻が落ちる時刻（phase）。帯が上がるほど本数が増える */
  private strikeTimes(): number[] {
    switch (this.tier) {
      case "MYTH": return [0.10, 0.22, 0.34, 0.48];
      case "RARE": return [0.12, 0.36];
      default:     return [0.14];
    }
  }

  /**
   * 稲妻を1本落とす。
   * 上から的まで折れ線を引き、そこへ火花を散らす。
   * **折れ幅は的に近いほど小さくする。** 一定だと、当たる位置が毎回ぶれて見える
   */
  private strike(cx: number, cy: number): void {
    const tx = cx + (this.rng() - 0.5) * 30;
    const segs = 9;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= segs; i++) {
      const k = i / segs;
      const near = 1 - k;                       // 上ほど自由に折れる
      const x = tx * k + (tx - 40 + this.rng() * 80) * (1 - k);
      pts.push({
        x: x + (this.rng() - 0.5) * 26 * near,
        y: -6 + (cy + 6) * k,
      });
    }
    // 枝。中ほどから斜めに1本だけ伸ばす
    let branch: Array<{ x: number; y: number }> | null = null;
    const from = pts[3 + ((this.rng() * 3) | 0)];
    if (from && this.rng() < 0.75) {
      const dir = this.rng() < 0.5 ? -1 : 1;
      const line = [from];
      let bx = from.x, by = from.y;
      for (let i = 0; i < 3; i++) {
        bx += dir * (10 + this.rng() * 16);
        by += 12 + this.rng() * 14;
        line.push({ x: bx, y: by });
      }
      branch = line;
    }
    const life = 0.20 + this.rng() * 0.08;
    this.bolts.push({ pts, branch, life, maxLife: life });

    // 着弾の火花。横へ跳ねて、すぐ落ちる
    const bits = Math.round(10 + 10 * this.scale);
    const hitX = pts[pts.length - 1]?.x ?? tx;
    for (let i = 0; i < bits; i++) {
      const a = -Math.PI / 2 + (this.rng() - 0.5) * 2.4;
      const sp = 90 + this.rng() * 190;
      const l = 0.16 + this.rng() * 0.3;
      this.sparks.push({
        x: hitX, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.75,
        life: l, maxLife: l,
        size: this.rng() < 0.4 ? 2 : 1,
        col: this.rng() < 0.4 ? "#ffffff" : undefined,
      });
    }
  }

  /**
   * 印を押す。押した瞬間に、外から金の粒が吸い込まれる。
   * **輪が縮みきったところで押す**ので、押印の位置は説明しなくても分かる
   */
  private stamp(cx: number, cy: number): void {
    const n = Math.round(16 * this.scale);
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 40 + this.rng() * 40 * this.scale;
      const life = 0.30 + this.rng() * 0.35;
      this.sparks.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * 0.7,
        vx: -Math.cos(a) * (r / life),
        vy: -Math.sin(a) * (r * 0.7 / life),
        life, maxLife: life,
        size: this.rng() < 0.25 ? 2 : 1,
        col: this.rng() < 0.3 ? "#fff6de" : undefined,
      });
    }
    // 押したあとに、金粉がわずかに落ちる
    const dust = Math.round(8 * this.scale);
    for (let i = 0; i < dust; i++) {
      const life = 0.5 + this.rng() * 0.5;
      this.sparks.push({
        x: cx + (this.rng() - 0.5) * 46,
        y: cy + (this.rng() - 0.5) * 30,
        vx: (this.rng() - 0.5) * 12,
        vy: 8 + this.rng() * 16,
        life, maxLife: life,
        size: 1,
        grav: 40, drag: 0.4,
      });
    }
  }

  update(dt: number): void {
    if (!this.active) return;
    this.t += dt;

    // 神話級：炸裂の瞬間に粒子を解き放つ
    if (!this.sparksSpawned && this.t / this.dur >= 0.46) {
      this.sparksSpawned = true;
      this.spawnSparks();
    }

    const e = ELEMENT[this.element];
    const cx = this.tier === "MYTH" ? SCREEN_W / 2 : 240;
    const cy = this.tier === "MYTH" ? SCREEN_H / 2 : 84;
    const q = this.phase;

    // ── 火：燃えているあいだ、出し続ける ─────────────
    if (e.kind === "ember" && this.sparksSpawned && q < 0.62) {
      this.emitAcc += (60 + 150 * this.scale) * dt;
      while (this.emitAcc >= 1) {
        this.emitAcc -= 1;
        this.emitEmber(cx, cy);
      }
    }

    // ── 氷：出そろってから割る ────────────────────
    if (e.kind === "shatter" && this.sparksSpawned && !this.shattered && q >= 0.46) {
      this.shattered = true;
      this.shatterPlates();
    }

    // ── 雷：時刻が来たら落とす ────────────────────
    if (e.kind === "strike" && this.sparksSpawned) {
      const times = this.strikeTimes();
      while (this.struck < times.length && q >= (times[this.struck] ?? 1)) {
        this.struck++;
        this.strike(cx, cy);
      }
    }
    for (const b of this.bolts) b.life -= dt;
    this.bolts = this.bolts.filter((b) => b.life > 0);

    // ── 名：輪が縮みきったところで押す ──────────────
    if (e.kind === "seal" && this.sparksSpawned && !this.sealed && q >= 0.52) {
      this.sealed = true;
      this.stamp(cx, cy);
    }

    // ── 粒子 ──────────────────────────────
    for (const s of this.sparks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // ゆらゆら昇る（火の粉）。横の位置だけを揺らす
      if (s.wob !== undefined) s.x += Math.sin(this.t * 7 + s.wob) * 13 * dt;
      s.vy += (s.grav ?? e.gravity) * dt; // 負なら浮き上がる
      const drag = s.drag ?? e.drag;
      s.vx *= 1 - drag * dt;
      s.vy *= 1 - drag * dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    // ── 揺れ ──────────────────────────────
    const p = this.t / this.dur;
    let amp = 0;
    if (this.tier === "MYTH") {
      // 炸裂の瞬間（0.46あたり）から強く揺れて減衰する
      amp = 7 * Math.max(0, 1 - (p - 0.46) * 4) * (p > 0.46 ? 1 : 0);
    } else if (this.tier === "RARE") {
      amp = 3 * Math.max(0, 1 - (p - 0.12) * 6) * (p > 0.12 ? 1 : 0);
    }
    // 割れた瞬間だけ、帯に関係なく短く突く
    if (e.kind === "shatter" && this.shattered) {
      amp = Math.max(amp, 3.5 * Math.max(0, 1 - (q - 0.46) * 9) * this.scale);
    }
    // 落雷は落ちるたびに突く。**光っているあいだだけ**
    if (this.bolts.length > 0) {
      const fresh = Math.max(...this.bolts.map((b) => b.life / b.maxLife));
      amp = Math.max(amp, 4 * fresh * Math.min(1.4, this.scale));
    }
    // 押印は、押した一瞬だけ沈み込む
    if (e.kind === "seal" && this.sealed) {
      amp = Math.max(amp, 3 * Math.max(0, 1 - (q - 0.52) * 12) * this.scale);
    }
    amp *= this.short ? 0.5 : 1;
    this.shakeX = amp > 0 ? Math.round((this.rng() - 0.5) * 2 * amp) : 0;
    this.shakeY = amp > 0 ? Math.round((this.rng() - 0.5) * 2 * amp) : 0;

    if (
      this.t >= this.dur &&
      this.sparks.length === 0 &&
      this.plates.length === 0 &&
      this.bolts.length === 0
    ) {
      this.active = false;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  /** UIの上に重ねる暗転。溜めを作るための層 */
  renderBehind(d: Display): void {
    if (!this.active) return;
    const p = this.t / this.dur;
    let dim = 0;

    if (this.locked) {
      // 暗転したまま、静かに晴れる。炸裂はない
      dim = seg(p, 0, 0.14) * 0.82;
      if (p > 0.62) dim = 0.82 * (1 - easeOutCubic(seg(p, 0.62, 1)));
    } else if (this.tier === "MYTH") {
      // 0.00-0.14 でほぼ暗転 → 0.46 まで保持 → 炸裂とともに晴れる
      dim = seg(p, 0, 0.14) * 0.88;
      if (p > 0.46) dim = 0.88 * (1 - easeOutCubic(seg(p, 0.46, 0.62)));
    } else if (this.tier === "RARE") {
      dim = seg(p, 0, 0.1) * 0.5;
      if (p > 0.14) dim = 0.5 * (1 - easeOutCubic(seg(p, 0.14, 0.4)));
    }

    if (dim > 0) {
      d.ctx.globalAlpha = dim;
      d.rect(0, 0, SCREEN_W, SCREEN_H, "#050403");
      d.ctx.globalAlpha = 1;
    }
  }

  /** 光の層。すべて加算合成で描く */
  renderFront(d: Display): void {
    if (!this.active) return;
    const ctx = d.ctx;
    const p = this.t / this.dur;
    // 粒と光は属性の色。**輪だけ帯の色**にしてあるので、
    // 「何の魔法か」と「どれくらい強いか」が同時に読める
    const col = this.tier === "DUD" ? TIER_COLOR.DUD : ELEMENT[this.element].color;
    const tierCol = TIER_COLOR[this.tier];
    const isMyth = this.tier === "MYTH";
    const cx = isMyth ? SCREEN_W / 2 : 240;
    const cy = isMyth ? SCREEN_H / 2 : 84;

    // ── 届かなかった言葉：浮かび上がって、そのまま消える ────
    if (this.locked) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      this.drawRisingWord(d, p);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // ── 神話級：文字が1文字ずつ浮かび上がる ──────────
    if (isMyth) this.drawRisingWord(d, p);

    // ── 放射光線（レア以上） ──────────────────────
    // **段取りを持つ属性では出さない。** 稲妻も印形も、この光線に埋もれる。
    // 光線は「他に見せる形が無い属性」のための飾りである
    // 癒しも出さない。**放射光線は殴る絵**で、傷を塞ぐ場面に合わない
    const plain = ELEMENT[this.element].kind === "particles" && this.element !== "HEAL";
    if (plain && (this.tier === "RARE" || isMyth)) {
      const burstAt = isMyth ? 0.46 : 0.12;
      const rp = seg(p, burstAt, 1);
      if (rp > 0 && rp < 1) {
        const rays = isMyth ? 16 : 10;
        const len = (isMyth ? 260 : 130) * easeOutQuint(rp);
        const alpha = (1 - rp) * (isMyth ? 0.5 : 0.3);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col;
        const spin = this.t * (isMyth ? 0.5 : 0.9);
        for (let i = 0; i < rays; i++) {
          const a = spin + (i / rays) * Math.PI * 2;
          const w = (isMyth ? 0.06 : 0.045) * (1 - rp * 0.5);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len);
          ctx.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // ── 拡散リング ────────────────────────────
    // 稲妻と印形は**自前の輪**を持っているので、ここでは出さない。
    // 二重に輪が広がると、どちらが本体なのか読めなくなる
    const ringKind = ELEMENT[this.element].kind;
    const ringDefs: Array<{ at: number; span: number; r: number }> =
      ringKind === "strike" || ringKind === "seal"
      ? []
      : isMyth
        ? [{ at: 0.46, span: 0.34, r: 300 }, { at: 0.50, span: 0.30, r: 210 }, { at: 0.55, span: 0.26, r: 130 }]
        : this.tier === "RARE"
          ? [{ at: 0.10, span: 0.55, r: 170 }, { at: 0.18, span: 0.45, r: 105 }]
          : this.tier === "UNCOMMON"
            ? [{ at: 0.05, span: 0.6, r: 70 }]
            : [];
    for (const rd of ringDefs) {
      const rp = seg(p, rd.at, rd.at + rd.span);
      if (rp <= 0 || rp >= 1) continue;
      ctx.globalAlpha = (1 - rp) * 0.55;
      // 一度これを**帯の色**にしてみたが、紫の輪が金や橙の粒とぶつかって濁った。
      // 帯は尺・粒の数・揺れで十分に伝わるので、色は属性に揃える
      ctx.strokeStyle = col;
      ctx.lineWidth = 1 + (1 - rp) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, easeOutQuint(rp) * rd.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── 自分に起きたこと（癒し）────────────────────
    // **敵の位置では何も起こさない。** 画面の両端が息をして、
    // 最後に画面の縁が内へ閉じる。傷が塞がるのは、こちら側である
    if (ELEMENT[this.element].origin === "self") {
      const k = pulse(seg(p, 0.02, 0.92));
      const bw = 12 + 16 * this.scale;
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.09 * k * (1 - i / 5);
        ctx.fillStyle = col;
        const w = bw * (1 - i / 6);
        ctx.fillRect(0, 0, w, 132);
        ctx.fillRect(SCREEN_W - w, 0, w, 132);
      }
      // ここに「画面の縁が内側へ寄る」締めを置いていたが、**何が起きたか読めなかった。**
      // 傷が塞がる、という比喩が抽象的すぎて、ただ枠が動いたようにしか見えない。
      // 端の光と粒だけで「自分に起きたこと」は足りている
    }

    // ── 名：刻み目の輪が回りながら縮み、印が押されて沈む ──
    if (ELEMENT[this.element].kind === "seal") {
      const q = this.phase;
      // 二重の輪。逆向きに回して、縮む
      for (const ring of [{ r0: 78, sp: 1.6, ticks: 12 }, { r0: 54, sp: -2.4, ticks: 8 }]) {
        const k = seg(q, 0, 0.52);
        if (k <= 0 || q > 0.72) continue;
        const r = ring.r0 * (1 - easeOutCubic(k) * 0.82) * this.scale;
        const fade = q < 0.52 ? Math.min(1, k * 3) : 1 - seg(q, 0.52, 0.72);
        ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // 刻み目。これがあると「輪」ではなく「印形」に見える
        ctx.globalAlpha = 0.8 * fade;
        for (let i = 0; i < ring.ticks; i++) {
          const a = this.t * ring.sp + (i / ring.ticks) * Math.PI * 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          ctx.fillStyle = col;
          ctx.fillRect((x | 0) - 1, (y | 0) - 1, 2, 2);
        }
      }
      // 押印。上から降りてきて、押されて、沈む
      const st = seg(q, 0.40, 0.60);
      if (st > 0) {
        const down = easeOutQuint(st);
        const sink = seg(q, 0.60, 1);
        const size = (46 - 18 * down) * this.scale;
        const alpha = st < 1 ? 0.5 + down * 0.5 : (1 - easeOutCubic(sink)) * 0.9;
        ctx.globalAlpha = clamp01(alpha);
        ctx.strokeStyle = sink > 0.05 ? col : "#fff6de";
        ctx.lineWidth = 2;
        // 八角の印。角を落とすだけで「判子」に見える
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          const x = cx + Math.cos(a) * size * 0.5;
          const y = cy + Math.sin(a) * size * 0.5;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        // 中の一本線。名を刻んだ跡
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.22, cy);
        ctx.lineTo(cx + size * 0.22, cy);
        ctx.stroke();
      }
    }

    // ── 雷：落ちた稲妻 ─────────────────────────
    for (const b of this.bolts) {
      const k = clamp01(b.life / b.maxLife);
      // 光っては消える。**一定の明るさで出すと、ただの棒に見える**
      const blink = k > 0.72 ? 1 : ((this.t * 60) | 0) % 2 === 0 ? 0.85 : 0.35;
      const draw = (pts: Array<{ x: number; y: number }>, w: number, c: string, a: number) => {
        const head = pts[0];
        if (!head) return;
        ctx.globalAlpha = a;
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        for (const pt of pts.slice(1)) ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      };
      // 外側の光 → 白い芯、の順に重ねる
      draw(b.pts, 4, col, 0.28 * k * blink);
      draw(b.pts, 2, col, 0.75 * k * blink);
      draw(b.pts, 1, "#ffffff", 0.95 * k * blink);
      if (b.branch) {
        draw(b.branch, 2, col, 0.45 * k * blink);
        draw(b.branch, 1, "#ffffff", 0.6 * k * blink);
      }
      // 着弾点の光
      const end = b.pts[b.pts.length - 1];
      if (end) {
        ctx.globalAlpha = 0.5 * k * blink;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect((end.x | 0) - 3, cy - 2, 7, 4);
      }
    }

    // ── 氷の板 ────────────────────────────────
    // 出そろって、止まって、割れる。**止まっている時間が「パリーン」を作る**
    for (const pl of this.plates) {
      // **phase を使う。** 神話級は溜めのあとに板が出るので、p では早すぎる
      const grow = seg(this.phase, pl.delay * 0.3, pl.delay * 0.3 + 0.22);
      if (grow <= 0) continue;
      const k = easeOutQuint(Math.min(1, grow));
      const w = pl.w * k;
      const h = pl.h * k;
      ctx.save();
      ctx.translate(pl.x, pl.y);
      ctx.rotate(pl.rot);
      ctx.globalAlpha = 0.30 * k;
      ctx.fillStyle = ICE_PLATE;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      // 縁だけ強く光らせる。面を薄くしても板に見えるのはこの線のおかげ
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = ICE_EDGE;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(-w / 2) + 0.5, Math.round(-h / 2) + 0.5, Math.round(w), Math.round(h));
      ctx.restore();
    }

    // ── 粒子 ──────────────────────────────────
    for (const s of this.sparks) {
      const k = clamp01(s.life / s.maxLife);
      // ちらつき。**消える直前ほど激しく明滅する**（燃え尽きる火の粉）
      const flick = s.flick ? 0.55 + 0.45 * Math.sin(this.t * 34 + (s.wob ?? 0) * 5) : 1;
      ctx.globalAlpha = k * 0.9 * flick;
      ctx.fillStyle = s.col ?? col;
      // 火の粉は昇るほど痩せる
      const size = s.flick && k < 0.45 ? 1 : s.size;
      ctx.fillRect(s.x | 0, s.y | 0, size, size);
    }

    ctx.restore();

    // ── 全画面フラッシュ ──────────────────────────
    let flash = 0;
    let flashCol: string = col;
    if (isMyth) {
      // 炸裂の瞬間だけ白く飛ばし、そのあと金色の残光にする
      const white = pulse(seg(p, 0.46, 0.56));
      // 尺が 3.4 秒になったので、残光の窓も締める。
      // 0.5〜1.0 のままだと、1.7 秒ほど金色の膜が張り続けて絵が見えない
      const after = pulse(seg(p, 0.50, 0.82)) * 0.22;
      flash = Math.max(white * 0.95, after);
      // 神話の残光だけは金のまま。**帯の記号なので属性に渡さない**
      flashCol = white > after ? "#fff6de" : tierCol;
    } else if (this.tier === "RARE") {
      // 尺を1.5倍にしたぶん、**窓を狭めて薄くする。**
      // 同じ値のままだと、画面が属性色で塗りつぶされている時間が伸びて、
      // 粒も稲妻も何も見えなくなる（一度そうなった）
      flash = pulse(seg(p, 0.10, 0.30)) * 0.20;
    } else if (this.tier === "UNCOMMON") {
      flash = pulse(seg(p, 0, 0.30)) * 0.09;
    } else if (this.tier === "COMMON") {
      flash = pulse(seg(p, 0, 0.32)) * 0.05;
    }
    // 雷：落ちる前の予兆と、落ちた瞬間の白
    if (ELEMENT[this.element].kind === "strike") {
      const warn = pulse(seg(this.phase, 0, 0.13)) * 0.10;
      // 落ちた一瞬だけ白く飛ばす。**長く光らせると稲妻の形が消える**
      const hit = this.bolts.length
        ? Math.max(...this.bolts.map((b) => b.life / b.maxLife)) ** 3 * 0.26
        : 0;
      const v = Math.max(warn, hit);
      if (v > flash) { flash = v; flashCol = hit >= warn ? "#ffffff" : col; }
    }

    // 自分に起きたことは、**画面全体を薄く染める。**
    // 敵を殴る演出と違って、画面のどこか一点で起きた出来事に見せない
    if (ELEMENT[this.element].origin === "self") {
      const w = pulse(seg(p, 0, 0.85)) * 0.10;
      if (w > flash) { flash = w; flashCol = col; }
    }

    // 名：押した一瞬
    if (ELEMENT[this.element].kind === "seal" && this.sealed) {
      const s = pulse(seg(this.phase, 0.50, 0.62)) * 0.24;
      if (s > flash) { flash = s; flashCol = "#fff6de"; }
    }

    // 氷が割れる瞬間だけ、白を一枚差す。**割れ目は光で見せる**
    if (ELEMENT[this.element].kind === "shatter" && this.shattered) {
      const cr = pulse(seg(this.phase, 0.45, 0.57)) * 0.32;
      if (cr > flash) { flash = cr; flashCol = "#ffffff"; }
    }

    if (flash > 0) {
      ctx.globalAlpha = flash;
      d.rect(0, 0, SCREEN_W, SCREEN_H, flashCol);
      ctx.globalAlpha = 1;
    }

    // ── 不発：淡い一瞬の明滅だけ。喜ばせない ──────────
    if (this.tier === "DUD") {
      ctx.globalAlpha = pulse(seg(p, 0, 0.6)) * 0.1;
      d.rect(0, 0, SCREEN_W, SCREEN_H, "#4a4038");
      ctx.globalAlpha = 1;
    }
  }

  /**
   * 神話級の中核。暗闇のなかに文字が1つずつ立ち上がる。
   * 36px は 12px の3倍なのでドットフォントが崩れない。
   */
  private drawRisingWord(d: Display, p: number): void {
    const reveal = seg(p, 0.14, this.locked ? 0.58 : 0.46); // 溜めの間に書き上がる
    if (reveal <= 0) return;
    const ctx = d.ctx;
    const size = 36;
    const chars = [...this.word];
    const shown = Math.ceil(reveal * chars.length);
    const full = this.word.slice(0, shown);
    const w = d.measure(full, size);
    const totalW = d.measure(this.word, size);
    const x = Math.round((SCREEN_W - totalW) / 2);
    const y = Math.round(SCREEN_H / 2 - size / 2) - 10;

    if (this.locked) {
      // 届かない言葉。淡く灯って、力なく消える
      const fade = 1 - easeOutCubic(seg(p, 0.62, 1));
      ctx.globalAlpha = (0.35 + pulse(seg(p, 0.14, 1)) * 0.35) * fade;
      d.text(full, x, y, TIER_COLOR.MYTH, size);
      ctx.globalAlpha = 1;
      return;
    }

    // 炸裂後は白へ飛ばす
    const burst = seg(p, 0.46, 0.60);
    const glow = 0.4 + pulse(seg(p, 0.14, 1)) * 0.6;

    ctx.globalAlpha = Math.min(1, 0.55 + glow * 0.45);
    d.text(full, x, y, burst > 0.2 ? "#fff6de" : TIER_COLOR.MYTH, size);

    // 書き進んでいる先端に光を置く
    if (shown < chars.length) {
      ctx.globalAlpha = 0.8;
      d.rect(x + w + 2, y + 4, 3, size - 8, "#fff6de");
    }
    ctx.globalAlpha = 1;
  }
}
