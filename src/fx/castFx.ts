import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { TIER_COLOR } from "../core/palette.ts";
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
};

/** 帯ごとの演出の長さ（秒） */
const DURATION: Record<Tier, number> = {
  DUD: 0.40,
  COMMON: 0.50,
  UNCOMMON: 0.75,
  RARE: 1.30,
  MYTH: 2.80,
};

/** 短縮版の倍率。戦闘で撃ち慣れた呪文はここまで縮める */
const SHORT_SCALE = 0.42;

export class CastFx {
  private tier: Tier = "DUD";
  private word = "";
  private t = 0;
  private dur = 0;
  private active = false;
  private short = false;
  private rng: () => number = makeRng(1);
  private sparks: Spark[] = [];
  private sparksSpawned = false;
  private shakeX = 0;
  private shakeY = 0;

  get isActive(): boolean {
    return this.active;
  }

  /** 画面全体に適用する揺れ量 */
  get shake(): { x: number; y: number } {
    return { x: this.shakeX, y: this.shakeY };
  }

  /**
   * 演出を開始する。
   * @param hash 呪文のハッシュ。粒子の飛び方の種に使う（同じ言葉は同じ光になる）
   * @param short 撃ち慣れた呪文の短縮版にするか
   */
  play(tier: Tier, word: string, hash: number, short = false): void {
    this.tier = tier;
    this.word = word;
    this.short = short;
    this.t = 0;
    this.dur = DURATION[tier] * (short ? SHORT_SCALE : 1);
    this.active = true;
    this.rng = makeRng(hash);
    this.sparks = [];
    // 神話級は溜めの静けさを守るため、炸裂の瞬間まで粒子を出さない
    this.sparksSpawned = false;
    if (tier !== "MYTH") {
      this.sparksSpawned = true;
      this.spawnSparks();
    }
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

    for (let i = 0; i < count * (this.short ? 0.5 : 1); i++) {
      const a = this.rng() * Math.PI * 2;
      const speed = 30 + this.rng() * (this.tier === "MYTH" ? 190 : 90);
      const life = 0.35 + this.rng() * (this.tier === "MYTH" ? 1.5 : 0.6);
      this.sparks.push({
        x: cx, y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed * 0.7,
        life, maxLife: life,
        size: this.rng() < 0.2 ? 2 : 1,
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

    // ── 粒子 ──────────────────────────────
    for (const s of this.sparks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 26 * dt;      // わずかに落ちる
      s.vx *= 1 - 1.6 * dt; // 空気抵抗
      s.vy *= 1 - 1.6 * dt;
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
    amp *= this.short ? 0.5 : 1;
    this.shakeX = amp > 0 ? Math.round((this.rng() - 0.5) * 2 * amp) : 0;
    this.shakeY = amp > 0 ? Math.round((this.rng() - 0.5) * 2 * amp) : 0;

    if (this.t >= this.dur && this.sparks.length === 0) {
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

    if (this.tier === "MYTH") {
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
    const col = TIER_COLOR[this.tier];
    const isMyth = this.tier === "MYTH";
    const cx = isMyth ? SCREEN_W / 2 : 240;
    const cy = isMyth ? SCREEN_H / 2 : 84;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // ── 神話級：文字が1文字ずつ浮かび上がる ──────────
    if (isMyth) this.drawRisingWord(d, p);

    // ── 放射光線（レア以上） ──────────────────────
    if (this.tier === "RARE" || isMyth) {
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
    const ringDefs: Array<{ at: number; span: number; r: number }> =
      isMyth
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
      ctx.strokeStyle = col;
      ctx.lineWidth = 1 + (1 - rp) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, easeOutQuint(rp) * rd.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── 粒子 ──────────────────────────────────
    ctx.fillStyle = col;
    for (const s of this.sparks) {
      ctx.globalAlpha = clamp01(s.life / s.maxLife) * 0.9;
      ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
    }

    ctx.restore();

    // ── 全画面フラッシュ ──────────────────────────
    let flash = 0;
    let flashCol: string = col;
    if (isMyth) {
      // 炸裂の瞬間だけ白く飛ばし、そのあと金色の残光にする
      const white = pulse(seg(p, 0.46, 0.56));
      const after = pulse(seg(p, 0.5, 1.0)) * 0.35;
      flash = Math.max(white * 0.95, after);
      flashCol = white > after ? "#fff6de" : col;
    } else if (this.tier === "RARE") {
      flash = pulse(seg(p, 0.1, 0.45)) * 0.42;
    } else if (this.tier === "UNCOMMON") {
      flash = pulse(seg(p, 0, 0.5)) * 0.16;
    } else if (this.tier === "COMMON") {
      flash = pulse(seg(p, 0, 0.5)) * 0.08;
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
    const reveal = seg(p, 0.14, 0.46); // 溜めの間に書き上がる
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
