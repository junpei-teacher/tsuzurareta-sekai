import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { THEMES, type ThemeId, type VisualTheme } from "../core/theme.ts";

export type BattleBackdropVariant = "default" | "boundary";

function renderFarLayer(d: Display, t: number, id: ThemeId, theme: VisualTheme): void {
  const ctx = d.ctx;
  ctx.save();

  if (id === "village") {
    // 梁、棚、朝窓。共同倉の生活感を残しつつ、敵の背後は空ける。
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = theme.shadow;
    ctx.fillRect(0, 18, SCREEN_W, 9);
    ctx.fillRect(0, 69, SCREEN_W, 6);
    for (const x of [38, 118, 350, 432]) ctx.fillRect(x, 0, 11, 126);

    ctx.fillStyle = "#8cb7ae";
    ctx.fillRect(356, 23, 68, 42);
    ctx.fillStyle = "#d8c994";
    ctx.fillRect(388, 23, 3, 42);
    ctx.fillRect(356, 43, 68, 3);

    ctx.globalAlpha = 0.17;
    ctx.fillStyle = theme.glow;
    ctx.beginPath();
    ctx.moveTo(356, 64);
    ctx.lineTo(424, 64);
    ctx.lineTo(338, 132);
    ctx.lineTo(280, 132);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.34;
    for (const x of [12, 76, 390, 444]) {
      ctx.fillStyle = "#403d2a";
      ctx.fillRect(x, 79, 44, 43);
      ctx.fillStyle = "#8d7950";
      ctx.fillRect(x + 3, 92, 38, 2);
      ctx.fillRect(x + 3, 108, 38, 2);
    }
  } else if (id === "ruin") {
    // 森の線を消し、欠損した石積みと校訂印の円だけを反復する。
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = "#20293a";
    ctx.fillRect(0, 0, SCREEN_W, 126);
    for (let x = -18; x < SCREEN_W; x += 54) {
      const y = 17 + ((x / 54) % 2) * 8;
      ctx.strokeStyle = "#465269";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, 49, 30);
      ctx.strokeRect(x + 25, y + 37, 53, 29);
    }
    ctx.fillStyle = "#59667c";
    for (const x of [36, 110, 358, 432]) {
      ctx.fillRect(x, 18, 7, 109);
      ctx.fillRect(x - 8, 16, 23, 5);
    }
    ctx.globalAlpha = 0.26 + Math.sin(t * 1.4) * 0.04;
    ctx.strokeStyle = theme.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(239, 63, 35, Math.PI * 0.14, Math.PI * 1.86);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(239, 63, 22, Math.PI * 0.14, Math.PI * 1.86);
    ctx.stroke();
  } else {
    // 遠い幹と枝葉。敵の輪郭を邪魔しないよう中央だけ密度を落とす。
    ctx.globalAlpha = 0.34;
    for (let i = 0; i < 12; i++) {
      const x = i * 46 - 18;
      if (x > 176 && x < 292) continue;
      const w = 9 + (i % 3) * 4;
      ctx.fillStyle = i % 2 === 0 ? theme.foliage : theme.shadow;
      ctx.fillRect(x, 14 + (i % 4) * 5, w, 112);
      ctx.fillRect(x - 18, 22 + (i % 5) * 8, w + 44, 8);
      ctx.fillRect(x - 11, 39 + (i % 3) * 11, w + 29, 7);
    }
  }

  ctx.restore();
}

function renderNearFrame(d: Display, id: ThemeId): void {
  const ctx = d.ctx;
  ctx.save();
  if (id === "forest") {
    ctx.globalAlpha = 0.54;
    ctx.fillStyle = "#04100d";
    ctx.fillRect(0, 0, 28, 76);
    ctx.fillRect(SCREEN_W - 25, 0, 25, 83);
    for (const [x, y, w] of [[0, 18, 62], [0, 39, 45], [420, 22, 60], [438, 48, 42]] as const) {
      ctx.fillRect(x, y, w, 8);
    }
  } else if (id === "village") {
    ctx.globalAlpha = 0.40;
    ctx.fillStyle = "#18271f";
    ctx.fillRect(0, 0, 15, 138);
    ctx.fillRect(SCREEN_W - 15, 0, 15, 138);
  } else {
    ctx.globalAlpha = 0.46;
    ctx.fillStyle = "#080a12";
    ctx.fillRect(0, 0, 18, 138);
    ctx.fillRect(SCREEN_W - 18, 0, 18, 138);
    ctx.fillStyle = "#303a4e";
    ctx.fillRect(0, 17, 44, 6);
    ctx.fillRect(SCREEN_W - 44, 17, 44, 6);
  }
  ctx.restore();
}

/**
 * 戦闘計算と切り離した環境背景。
 * 現段階では森を既定にし、フィールドのテーマ受け渡しを作ったあと村・遺跡へ広げる。
 */
export function renderBattleBackdrop(
  d: Display, t: number, id: ThemeId = "forest", variant: BattleBackdropVariant = "default",
): void {
  const theme = THEMES[id];
  const ctx = d.ctx;
  d.clear(theme.skyTop);

  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, 136);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(0.62, theme.skyBottom);
  sky.addColorStop(1, theme.shadow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, 136);

  renderFarLayer(d, t, id, theme);

  if (variant === "boundary") {
    // フィールドで見た白い木を戦闘にも残し、「戦闘用の別空間」へ切り替えない。
    ctx.globalAlpha = 0.68;
    for (const x of [104, 145, 326, 370]) {
      ctx.fillStyle = "#b9c4b2";
      ctx.fillRect(x, 14, 9, 114);
      ctx.fillStyle = "#708679";
      ctx.fillRect(x + 2, 35 + (x % 3) * 8, 6, 3);
      ctx.fillRect(x, 76 + (x % 2) * 10, 5, 2);
    }
    // 中央の獣の輪郭は空け、左右だけ森の枝を密にする。
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#193a32";
    for (const x of [22, 50, 82, 397, 426, 456]) {
      ctx.fillRect(x, 30 + (x % 4) * 9, 12, 98);
      ctx.fillRect(x - 13, 48 + (x % 3) * 13, 39, 7);
    }
  }

  // 地面。UI窓の直前まで続け、敵の足が暗部へ接地するようにする。
  ctx.globalAlpha = 1;
  const ground = ctx.createLinearGradient(0, 76, 0, 138);
  ground.addColorStop(0, theme.groundLight);
  ground.addColorStop(0.26, theme.ground);
  ground.addColorStop(1, theme.shadow);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 76, SCREEN_W, 62);

  if (variant === "boundary") {
    // 村から続いてきた足跡。爪先は中央の獣でなく、右奥の森を向く。
    ctx.globalAlpha = 0.42;
    for (const [x, y] of [[58, 119], [85, 113], [115, 108], [146, 103]] as const) {
      ctx.fillStyle = "#263b31";
      ctx.fillRect(x, y, 4, 2);
      ctx.fillRect(x + 7, y + 3, 4, 2);
      ctx.fillRect(x + 3, y, 2, 1);
      ctx.fillRect(x + 10, y + 3, 2, 1);
    }
  }

  // 足元の材質を土地ごとに少量だけ置く。中央は接地線を読みやすく保つ。
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 16; i++) {
    const x = (17 + i * 67) % SCREEN_W;
    const y = 92 + ((i * 19) % 36);
    const color = id === "ruin" ? "#8c9ab5" : id === "village" ? "#d2b978" : "#6f9271";
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 7 + (i % 3) * 5, 1);
  }

  // 低い霧。毎フレーム座標だけ動かし、半透明の帯で十分な奥行きを出す。
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = theme.fog;
  for (let i = 0; i < 5; i++) {
    const x = ((i * 121 + t * (3 + i * 0.35)) % (SCREEN_W + 90)) - 90;
    ctx.fillRect(Math.round(x), 82 + i * 9, 92 + (i % 2) * 38, 2);
  }

  // 画面の縁を落とし、敵と入力窓へ視線を集める。
  ctx.globalAlpha = 1;
  const vignette = ctx.createRadialGradient(
    SCREEN_W / 2, 70, 56,
    SCREEN_W / 2, 70, 290,
  );
  vignette.addColorStop(0, "rgba(3, 9, 8, 0)");
  vignette.addColorStop(1, "rgba(3, 9, 8, 0.70)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.restore();

  renderNearFrame(d, id);

  // 規則的な少数の粒子。敵の顔の中央には置かない。
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const x = (29 + i * 97 + Math.sin(t * 0.35 + i) * 4) % SCREEN_W;
    const y = (16 + i * 31 - t * (1.2 + (i % 3) * 0.4) + 128) % 128;
    if (x > 205 && x < 275 && y > 36 && y < 112) continue;
    ctx.globalAlpha = i % 5 === 0 ? 0.52 : 0.22;
    const bright = id === "village" ? PAL.accent : id === "ruin" ? PAL.memory : PAL.accentCool;
    d.rect(Math.round(x), Math.round(y), i % 5 === 0 ? 2 : 1, 1, bright);
  }
  ctx.restore();
}
