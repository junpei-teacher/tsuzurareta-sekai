import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { HERO_HAIR, PAL } from "../core/palette.ts";
import { THEMES } from "../core/theme.ts";

export type StorehouseOptions = {
  night?: boolean;
  depleted?: boolean;
  showSenaTag?: boolean;
  playerName?: string;
  /** 正式背景が未読込・不正寸法なら、従来のコード背景へ自動で戻る。 */
  background?: HTMLImageElement;
};

export type StoryPersonKind =
  | "heroChild" | "senaChild" | "heroAdult"
  | "keeper" | "villager" | "hunter" | "merchant" | "guardian" | "sena";

export type StoryPersonMotion = {
  mode: "idle" | "walk";
  frame: number;
  /** セナの終戦演出だけで使う。左手を下げても指輪の左右は反転させない。 */
  ringHandLower?: number;
  /** 涸れ沢で救出される前の若い狩人。 */
  injured?: boolean;
};

export type StoryPortraitId = "hero" | "sena" | "sena_masked" | "hunter_chief" | "merchant";

export type VillageRoadOptions = {
  merchantArrived?: boolean;
  fireDateKnown?: boolean;
  /** 正式背景が未読込・不正寸法なら、従来のコード背景へ自動で戻る。 */
  background?: HTMLImageElement;
};

export type ForestBoundaryOptions = {
  disturbed?: boolean;
  /** 固定景観の任意画像。未読込・不正寸法ならコード背景へ戻る。 */
  background?: HTMLImageElement;
  atmosphere?: boolean;
};

export type VillageGateOptions = ForestBoundaryOptions & {
  warningKnown?: boolean;
  borderOpen?: boolean;
  hunterDeparted?: boolean;
  /** 正式背景が未読込・不正寸法なら、従来のコード背景へ自動で戻る。 */
  background?: HTMLImageElement;
};

export type ForestEntranceOptions = {
  /** 生成用の静的な構図参照では、光・霧・粒子を別にする。 */
  atmosphere?: boolean;
  /** 調査対象の足跡。背景素材へ焼き込まず、後から重ねられるようにする。 */
  tracks?: boolean;
};

const STORY_PORTRAITS = new Set<string>([
  "hero", "sena", "sena_masked", "hunter_chief", "merchant",
]);

export function isStoryPortraitId(id: string | undefined): id is StoryPortraitId {
  return id !== undefined && STORY_PORTRAITS.has(id);
}

/**
 * シリーズ2の会話用64×64肖像。
 *
 * フィールド人物と同じ識別色・小物を使い、拡大顔だけ別作品になることを避ける。
 * 曲線補間は使わず、陰影も面の段差で作る。表情を増やす場合もこの素体を保つ。
 */
export function drawStoryPortrait(
  d: Display, x: number, y: number, id: StoryPortraitId,
): void {
  const ctx = d.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, 64, 64);
  ctx.clip();
  ctx.translate(Math.round(x), Math.round(y));

  const r = (rx: number, ry: number, w: number, h: number, color: string): void => {
    d.rect(rx, ry, w, h, color);
  };
  const hero = id === "hero";
  const sena = id === "sena" || id === "sena_masked";
  const masked = id === "sena_masked";
  const hunter = id === "hunter_chief";

  // 背景色は話者ごとに変えるが、森の青緑と木漏れ日の金を全員へ一片ずつ残す。
  const backdrop = hero ? "#244d47" : sena ? "#173e3d" : hunter ? "#304438" : "#513b54";
  const backdropDeep = hero ? "#142e2b" : sena ? "#102724" : hunter ? "#1b2b25" : "#2c2736";
  r(0, 0, 64, 64, backdropDeep);
  r(3, 3, 58, 58, backdrop);
  r(4, 4, 56, 9, hero ? "#3c7166" : sena ? "#285a55" : hunter ? "#53644b" : "#75566f");
  r(7, 7, 11, 4, "#7fa982");
  r(11, 4, 4, 3, "#b9c38c");
  r(51, 8, 6, 3, hero || hunter ? "#dfbd69" : "#72d6c0");
  r(5, 46, 54, 15, backdropDeep);

  if (hero) {
    // 生成りの短衣、苔色の襟巻き、茶の肩帯。フィールド姿の三記号をそのまま拡大する。
    r(6, 52, 52, 12, "#6d654e");
    r(12, 46, 42, 18, "#a99b75");
    r(17, 47, 32, 4, "#cdbf95");
    r(31, 48, 5, 16, "#765033");
    r(13, 43, 39, 8, "#315144");
    r(18, 42, 35, 7, "#527760");
    r(22, 43, 23, 2, "#82a273");

    // 三分の二正面。鼻先と片側の頬を1段だけ張り出させる。
    r(17, 12, 31, 31, "#7b4c3a");
    r(20, 13, 28, 29, "#b97d5f");
    r(23, 15, 27, 25, "#d9b184");
    r(47, 23, 5, 10, "#d9b184");
    r(45, 34, 4, 6, "#c58f6c");
    r(24, 35, 22, 7, "#c58f6c");
    r(20, 39, 8, 4, "#a86952");

    // 承認済みの茶髪。v21の水色試作から元の色面へ戻す。
    r(14, 9, 34, 8, HERO_HAIR.shadow);
    r(17, 7, 27, 6, HERO_HAIR.base);
    r(13, 14, 10, 18, HERO_HAIR.shadow);
    r(18, 12, 9, 12, HERO_HAIR.base);
    r(28, 10, 13, 7, HERO_HAIR.shade);
    r(33, 8, 8, 2, HERO_HAIR.highlight);
    r(14, 28, 6, 9, HERO_HAIR.outline);

    // 優しいが、記憶の穴を抱えた落ち着かない視線。
    r(28, 25, 6, 2, "#765a46");
    r(41, 24, 6, 2, "#765a46");
    r(30, 27, 3, 3, "#17211d");
    r(43, 26, 3, 3, "#17211d");
    r(31, 27, 1, 1, "#b9d3b9");
    r(44, 26, 1, 1, "#b9d3b9");
    r(38, 29, 3, 5, "#b57b60");
    r(34, 36, 9, 2, "#7f4f43");
    r(36, 38, 6, 1, "#d6a382");
  } else if (sena) {
    // 長髪と細身の青緑の上衣は、仮面の有無に関係なく同じ輪郭へ固定する。
    r(7, 14, 18, 42, "#12211f");
    r(12, 9, 38, 39, "#172724");
    r(8, 23, 12, 34, "#23403a");
    r(43, 17, 10, 35, "#12211f");
    r(8, 52, 50, 12, "#244b46");
    r(15, 45, 41, 19, "#3f746b");
    r(20, 46, 30, 4, "#69a18e");
    r(27, 51, 5, 13, "#183a36");

    if (masked) {
      // 石灰色の仮面。目の穴と右頬の欠けだけを非対称にする。
      r(18, 12, 31, 31, "#7c8b7e");
      r(20, 10, 28, 31, "#c9c9ad");
      r(23, 12, 24, 5, "#e6dfc2");
      r(19, 19, 30, 8, "#b9b9a1");
      r(24, 21, 7, 3, "#18302b");
      r(39, 20, 7, 3, "#18302b");
      r(26, 22, 3, 1, "#72d6c0");
      r(41, 21, 3, 1, "#72d6c0");
      r(35, 26, 3, 8, "#8d9b88");
      r(31, 35, 11, 2, "#758277");
      r(45, 33, 5, 6, backdrop);
      r(43, 31, 3, 3, "#8d9b88");
    } else {
      r(18, 12, 31, 31, "#80513e");
      r(21, 13, 28, 28, "#ae765d");
      r(24, 15, 26, 24, "#d9b184");
      r(47, 23, 5, 9, "#d9b184");
      r(21, 36, 24, 7, "#bd8667");
      r(17, 10, 33, 9, "#12211f");
      r(16, 14, 10, 20, "#23403a");
      r(36, 9, 12, 7, "#294b43");
      r(27, 24, 6, 2, "#6f5948");
      r(40, 23, 6, 2, "#6f5948");
      r(29, 26, 3, 3, "#15221f");
      r(42, 25, 3, 3, "#15221f");
      r(30, 26, 1, 1, "#72d6c0");
      r(43, 25, 1, 1, "#72d6c0");
      r(37, 28, 3, 5, "#b57b60");
      r(33, 36, 10, 2, "#74483f");
      r(35, 38, 7, 1, "#d2a080");
    }

    // 左手と指輪だけは肖像でも独立した手掛かりにする。常時発光ではなく2pxの反射。
    r(49, 47, 8, 17, "#315f5a");
    r(47, 42, 7, 13, "#d9b184");
    r(46, 43, 3, 9, "#b97d5f");
    r(47, 47, 2, 2, "#8d7452");
    r(48, 47, 2, 1, "#72d6c0");
  } else if (hunter) {
    // 深緑の頭巾と革の矢筒。頬の陰で森に慣れた年長者を示す。
    r(5, 51, 54, 13, "#26352c");
    r(10, 43, 48, 21, "#3e5a43");
    r(15, 44, 36, 4, "#89a078");
    r(45, 42, 8, 22, "#4a3727");
    r(48, 43, 2, 17, "#c4a15f");
    r(12, 9, 39, 35, "#1b2b25");
    r(15, 12, 34, 29, "#20352c");
    r(19, 16, 29, 27, "#9f684f");
    r(22, 17, 28, 23, "#cf9d73");
    r(47, 24, 5, 9, "#cf9d73");
    r(16, 8, 31, 8, "#294033");
    r(11, 13, 12, 22, "#294033");
    r(18, 14, 10, 9, "#3e5a43");
    r(26, 25, 7, 2, "#624b3d");
    r(40, 24, 7, 2, "#624b3d");
    r(28, 27, 3, 3, "#18211d");
    r(42, 26, 3, 3, "#18211d");
    r(35, 29, 3, 5, "#a56f55");
    r(31, 36, 13, 2, "#60443a");
    r(26, 39, 4, 2, "#6e594a");
    r(34, 41, 3, 2, "#6e594a");
    r(43, 39, 4, 2, "#6e594a");
    r(20, 31, 2, 5, "#a2775e");
  } else {
    // 低い梅紫の帽子と荷紐。温かい土色の顔を背景の紫から大きく抜く。
    r(4, 51, 56, 13, "#342d3a");
    r(9, 44, 48, 20, "#6a4666");
    r(13, 45, 40, 5, "#8f627e");
    r(12, 50, 5, 14, "#d0a765");
    r(47, 44, 8, 20, "#816540");
    r(15, 14, 36, 29, "#895a43");
    r(19, 15, 32, 27, "#c88f68");
    r(22, 17, 31, 22, "#dfb184");
    r(50, 24, 5, 10, "#dfb184");
    r(14, 9, 39, 8, "#684761");
    r(19, 6, 28, 7, "#8f627e");
    r(9, 13, 49, 5, "#684761");
    r(18, 14, 10, 7, "#5a3d2d");
    r(25, 25, 7, 2, "#775748");
    r(42, 24, 7, 2, "#775748");
    r(27, 27, 3, 3, "#241d20");
    r(44, 26, 3, 3, "#241d20");
    r(35, 29, 3, 5, "#b37c5e");
    r(29, 35, 7, 3, "#765044");
    r(38, 34, 9, 3, "#765044");
    r(33, 38, 10, 2, "#9b6650");
    r(53, 29, 3, 3, "#dfbd69");
  }

  // 左上の暗部と右下の光で、同寸の顔枠を小さな舞台として閉じる。
  r(3, 3, 2, 21, backdropDeep);
  r(4, 3, 18, 2, backdropDeep);
  r(59, 40, 2, 21, hero || hunter ? "#6d8b70" : "#628c85");
  r(43, 59, 18, 2, hero || hunter ? "#6d8b70" : "#628c85");
  ctx.restore();
}

/**
 * 過去と現在で同じ画角を使う共同倉。
 * 棚の中身と札だけを変え、十年の困窮と欠落を説明なしで見せる。
 */
export function renderStorehouse(d: Display, o: StorehouseOptions = {}): void {
  const ctx = d.ctx;
  const night = o.night ?? false;
  const depleted = o.depleted ?? false;

  if (isStorehouseBackgroundReady(o.background)) {
    d.clear(night ? "#07110f" : THEMES.village.shadow);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(o.background, 0, 0, SCREEN_W, SCREEN_H);
    if (night) renderAdoptedStorehouseNight(d);
    renderAdoptedStorehouseState(
      d,
      o.showSenaTag ?? false,
      o.playerName ?? "",
      depleted,
      night,
    );
    ctx.restore();
    return;
  }

  d.clear(night ? "#09110f" : THEMES.village.shadow);
  ctx.save();

  const wall = ctx.createLinearGradient(0, 0, 0, 142);
  wall.addColorStop(0, night ? "#10201d" : "#38594f");
  wall.addColorStop(1, night ? "#18251f" : "#796f50");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, SCREEN_W, 142);

  const floor = ctx.createLinearGradient(0, 142, 0, SCREEN_H);
  floor.addColorStop(0, night ? "#17231d" : "#655c3f");
  floor.addColorStop(1, night ? "#0a1210" : "#2a382b");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 142, SCREEN_W, SCREEN_H - 142);

  // 梁と板目。
  ctx.fillStyle = night ? "#0b1714" : "#273c32";
  ctx.fillRect(0, 18, SCREEN_W, 9);
  ctx.fillRect(0, 132, SCREEN_W, 10);
  ctx.fillRect(122, 0, 12, 142);
  ctx.fillRect(346, 0, 12, 142);
  // 板の継ぎ目と補修金具。物を増やさず、長く使われた倉の時間を足す。
  ctx.globalAlpha = night ? 0.12 : 0.18;
  ctx.fillStyle = night ? "#6f8177" : "#d5c28e";
  for (const y of [44, 78, 111]) ctx.fillRect(0, y, SCREEN_W, 1);
  ctx.globalAlpha = 1;
  for (const [x, y] of [[125, 42], [349, 91]] as const) {
    d.rect(x, y, 6, 13, night ? "#27342e" : "#5f5c47");
    d.rect(x + 2, y + 2, 2, 2, night ? "#58675f" : "#b29b67");
    d.rect(x + 2, y + 9, 2, 2, night ? "#58675f" : "#b29b67");
  }
  ctx.globalAlpha = night ? 0.18 : 0.30;
  ctx.fillStyle = night ? "#61736a" : "#d8c994";
  for (let y = 154; y < SCREEN_H; y += 18) ctx.fillRect(0, y, SCREEN_W, 1);
  for (let x = 30; x < SCREEN_W; x += 58) ctx.fillRect(x, 142, 1, SCREEN_H - 142);
  ctx.globalAlpha = 1;

  // 朝の窓。夜は輪郭だけ残す。
  ctx.fillStyle = night ? "#102b28" : "#a5c8b8";
  ctx.fillRect(370, 36, 66, 54);
  ctx.fillStyle = night ? "#17342f" : "#d8c994";
  ctx.fillRect(402, 36, 3, 54);
  ctx.fillRect(370, 62, 66, 3);
  ctx.strokeStyle = night ? "rgba(114,214,192,0.08)" : "rgba(226,189,104,0.16)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(389, 90);
  ctx.lineTo(322, 180);
  ctx.stroke();

  // 乾燥薬草。村が貧しくても手入れと備えは途切れていない。
  ctx.strokeStyle = night ? "#34453b" : "#746b43";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x = 338 + i * 6;
    ctx.beginPath();
    ctx.moveTo(x, 28);
    ctx.lineTo(x - 2, 51 + i * 2);
    ctx.stroke();
    d.rect(x - 5, 38 + i * 4, 4, 2, night ? "#26372f" : "#657048");
    d.rect(x - 1, 45 + i * 2, 4, 2, night ? "#26372f" : "#7c7448");
  }

  renderShelf(d, 16, 50, depleted, night, false);
  renderShelf(d, 364, 104, depleted, night, true);
  renderTagBoard(d, o.showSenaTag ?? false, o.playerName ?? "", night);

  // 床の接地暗部。会話窓より上で止める。
  const shade = ctx.createLinearGradient(0, 118, 0, 182);
  shade.addColorStop(0, "rgba(3,9,8,0)");
  shade.addColorStop(1, "rgba(3,9,8,0.38)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 118, SCREEN_W, 64);

  if (night) {
    ctx.globalAlpha = 0.36;
    ctx.fillStyle = "#171329";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  ctx.restore();
}

/** 共同倉PNGの読込失敗時に、物語を止めずコード背景へ戻すための共通判定。 */
export function isStorehouseBackgroundReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth === 960 && image.naturalHeight === 540);
}

/** 村道PNGの読込失敗時に、物語を止めずコード背景へ戻すための共通判定。 */
export function isVillageRoadBackgroundReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth === 960 && image.naturalHeight === 540);
}

/** 村門PNGの読込失敗時に、物語を止めずコード背景へ戻すための共通判定。 */
export function isVillageGateBackgroundReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth === 960 && image.naturalHeight === 540);
}

/**
 * v27背景には建物だけを焼き込み、年代で変わる在庫と配給札はここで重ねる。
 * これにより十年前・現在・終幕が、同じ画角のまま同じ物語状態を共有する。
 */
function renderAdoptedStorehouseState(
  d: Display,
  showSena: boolean,
  playerName: string,
  depleted: boolean,
  night: boolean,
): void {
  d.text("越冬配給札", 205, 68, night ? "#71827a" : "#343127", 9);
  if (showSena) {
    drawWoodTag(d, 180, 82, 104, 17, "SENA", night ? 0.45 : 1);
  } else {
    // セナの札だけが消えた日焼け跡。空の釘穴は過去と現在の照合点になる。
    d.rect(180, 82, 104, 17, night ? "#2d3b34" : "#8f7b51");
    d.rect(231, 87, 2, 2, night ? "#0a100e" : "#382f22");
  }
  // 下段の結び目が上段の欠落跡へ入り込まないよう、3pxの余白を確保する。
  if (playerName) drawWoodTag(d, 180, 108, 104, 17, playerName, night ? 0.45 : 1);

  const stock = depleted ? 3 : 8;
  const positions = [
    [45, 87], [78, 112], [48, 137], [94, 87],
    [392, 87], [424, 112], [394, 137], [438, 87],
  ] as const;
  for (let i = 0; i < stock; i++) {
    const [x, y] = positions[i]!;
    if (i % 3 === 1) {
      d.rect(x - 4, y - 11, 9, 12, night ? "#35443b" : "#8c7550");
      d.rect(x - 2, y - 13, 5, 2, night ? "#53645a" : "#b99a61");
    } else {
      drawSack(d, x, y, 0.68, night ? "#465449" : "#b99a61");
    }
  }
}

function renderAdoptedStorehouseNight(d: Display): void {
  d.ctx.globalAlpha = 0.62;
  d.rect(0, 0, SCREEN_W, SCREEN_H, "#07110f");
  d.ctx.globalAlpha = 0.22;
  d.rect(0, 0, SCREEN_W, SCREEN_H, "#171329");
  d.ctx.globalAlpha = 1;
}

function renderShelf(
  d: Display, x: number, w: number, depleted: boolean, night: boolean, right: boolean,
): void {
  const wood = night ? "#16231d" : "#403d2a";
  const edge = night ? "#26352d" : "#8d7950";
  d.rect(x, 35, w, 104, wood);
  d.frame(x, 35, w, 104, edge);
  for (const y of [68, 101, 132]) {
    d.rect(x + 4, y, w - 8, 5, wood);
    d.rect(x + 5, y, w - 10, 1, edge);
  }

  const count = depleted ? 3 : 8;
  for (let i = 0; i < count; i++) {
    const row = i % 3;
    const col = Math.floor(i / 3);
    const px = right ? x + w - 20 - col * 25 : x + 9 + col * 25;
    const py = 58 + row * 33;
    if (i % 3 === 1) {
      d.rect(px, py - 10, 10, 13, night ? "#2d3931" : "#8c7550");
      d.rect(px + 2, py - 12, 6, 2, edge);
    } else {
      drawSack(d, px + 5, py + 3, 0.72, night ? "#39443b" : "#b99a61");
    }
  }
}

function renderTagBoard(d: Display, showSena: boolean, playerName: string, night: boolean): void {
  const x = 176, y = 37, w = 154, h = 88;
  d.rect(x + 3, y + 4, w, h, night ? "#07100e" : "#25332a");
  d.rect(x, y, w, h, night ? "#26362e" : "#7f6d49");
  d.frame(x, y, w, h, night ? "#405249" : "#b49962");
  d.text("越冬配給札", x + 40, y + 8, night ? "#71827a" : "#e6d7a8", 10);
  if (showSena) {
    drawWoodTag(d, x + 20, y + 30, 114, 19, "SENA", night ? 0.45 : 1);
  } else {
    // セナの木札だけが消えた日焼け跡と、空の釘穴。
    d.rect(x + 20, y + 30, 114, 19, night ? "#2d3b34" : "#8f7b51");
    d.rect(x + 22, y + 32, 110, 15, night ? "#29372f" : "#87744c");
    d.rect(x + 75, y + 34, 2, 2, night ? "#0a100e" : "#382f22");
  }
  // 禁書が消したのはセナだけ。主人公の札は同じ場所に残り続ける。
  if (playerName) drawWoodTag(d, x + 20, y + 56, 114, 19, playerName, night ? 0.45 : 1);
}

/** 紐で吊った木札。夜の消失演出でも同じ形を使う。 */
export function drawWoodTag(
  d: Display, x: number, y: number, w: number, h: number, text: string, alpha = 1,
): void {
  const ctx = d.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#6c5b3e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 7);
  ctx.lineTo(x + w / 2, y + 2);
  ctx.stroke();
  drawDoubleLoopKnot(d, x + w / 2, y - 6, 0.8, "#6c5b3e");
  d.rect(x + 2, y + 2, w, h, PAL.shadow);
  d.rect(x, y, w, h, "#b3955c");
  d.rect(x + 2, y + 2, w - 4, 1, "#d7bc79");
  d.frame(x, y, w, h, "#675439");
  d.rect(x + Math.floor(w / 2), y + 2, 2, 2, "#584830");
  const tw = d.measure(text, 11);
  d.text(text, Math.round(x + (w - tw) / 2), y + 4, "#1b211b", 11);
  ctx.restore();
}

/** セナの手癖として、輪を左右に二つ残す結び目。 */
export function drawDoubleLoopKnot(
  d: Display, cx: number, cy: number, scale = 1, color = "#6c5b3e", alpha = 1,
): void {
  const ctx = d.ctx;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, scale);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx - 4 * scale, cy - 7 * scale, cx - 14 * scale, cy - 5 * scale, cx - 8 * scale, cy + 1 * scale);
  ctx.bezierCurveTo(cx - 5 * scale, cy + 3 * scale, cx - 1 * scale, cy + 1 * scale, cx, cy);
  ctx.bezierCurveTo(cx + 4 * scale, cy - 7 * scale, cx + 14 * scale, cy - 5 * scale, cx + 8 * scale, cy + 1 * scale);
  ctx.bezierCurveTo(cx + 5 * scale, cy + 3 * scale, cx + 1 * scale, cy + 1 * scale, cx, cy);
  ctx.moveTo(cx - 1 * scale, cy + 1 * scale);
  ctx.lineTo(cx - 6 * scale, cy + 7 * scale);
  ctx.moveTo(cx + 1 * scale, cy + 1 * scale);
  ctx.lineTo(cx + 7 * scale, cy + 6 * scale);
  ctx.stroke();
  d.rect(Math.round(cx - scale), Math.round(cy - scale), Math.max(2, Math.round(2 * scale)), Math.max(2, Math.round(2 * scale)), color);
  ctx.restore();
}

/** 村門のすぐ外。白い幹を境界として、奥だけを深い青緑へ落とす。 */
export function renderForestBoundary(d: Display, t: number, o: ForestBoundaryOptions = {}): void {
  const ctx = d.ctx;
  const theme = THEMES.forest;
  if (isForestBoundaryBackgroundReady(o.background)) {
    d.clear(theme.skyTop);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(o.background, 0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
    if (o.disturbed) drawForestBoundaryTracks(d, true);
    if (o.atmosphere !== false) drawForestBoundaryAtmosphere(d, t);
    return;
  }
  d.clear(theme.skyTop);
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, 178);
  sky.addColorStop(0, "#3f7780");
  sky.addColorStop(0.52, "#79a98d");
  sky.addColorStop(1, "#31594d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, 178);

  // 奥の森。
  ctx.globalAlpha = 0.62;
  for (let i = 0; i < 11; i++) {
    const x = 245 + i * 28;
    const h = 72 + ((i * 31) % 50);
    ctx.fillStyle = i % 2 ? theme.shadow : theme.foliage;
    ctx.fillRect(x, 170 - h, 12, h);
    ctx.fillRect(x - 15, 85 + (i % 3) * 18, 42, 10);
  }
  ctx.globalAlpha = 1;

  // 村側の草と、奥へ続く道。
  ctx.fillStyle = "#5d7b50";
  ctx.fillRect(0, 142, SCREEN_W, SCREEN_H - 142);
  ctx.fillStyle = "#91845b";
  ctx.beginPath();
  ctx.moveTo(0, 155);
  ctx.lineTo(0, SCREEN_H);
  ctx.lineTo(SCREEN_W, SCREEN_H);
  ctx.lineTo(294, 150);
  ctx.closePath();
  ctx.fill();

  // 村から森へ色が渡る境目。鮮色は小さく置き、道の可読性は崩さない。
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = PAL.accent;
  ctx.beginPath();
  ctx.moveTo(20, 157);
  ctx.lineTo(135, 154);
  ctx.lineTo(188, 185);
  ctx.lineTo(61, 191);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const [x, y, color] of [
    [26, 151, "#e5bd59"], [58, 147, "#e47c67"], [113, 154, "#8ecf76"],
    [439, 151, "#72d6c0"], [458, 145, "#d9b45f"],
  ] as const) {
    d.rect(x, y, 2, 4, "#2e563e");
    d.rect(x - 1, y - 2, 4, 2, color);
  }

  if (o.disturbed) drawForestBoundaryTracks(d);

  // 境界の白い木。
  for (const x of [286, 344, 407]) {
    ctx.fillStyle = "#b9c4b2";
    ctx.fillRect(x, 28, 10, 132);
    ctx.fillStyle = "#708679";
    ctx.fillRect(x + 2, 48, 7, 3);
    ctx.fillRect(x, 83, 6, 3);
    ctx.fillRect(x + 4, 119, 6, 2);
  }

  if (o.atmosphere !== false) drawForestBoundaryAtmosphere(d, t);
  ctx.restore();
}

export function isForestBoundaryBackgroundReady(
  image: HTMLImageElement | undefined,
): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth === 960 && image.naturalHeight === 540);
}

/** 足跡の調査点x170を保ち、画像側では全組を水平な土道の上へ収める。 */
export function drawForestBoundaryTracks(d: Display, flatGround = false): void {
  const ctx = d.ctx;
  ctx.save();
  ctx.globalAlpha = 0.48;
  const points = flatGround
    ? [[118, 174], [146, 171], [176, 169], [207, 166], [238, 164]]
    : [[118, 170], [146, 166], [176, 162], [207, 158], [238, 154]];
  for (const [x, y] of points as [number, number][]) {
    d.rect(x, y, 4, 2, "#34483a");
    d.rect(x + 6, y + 4, 4, 2, "#34483a");
    d.rect(x + 3, y, 2, 1, "#21352b");
    d.rect(x + 9, y + 4, 2, 1, "#21352b");
  }
  d.rect(258, flatGround ? 166 : 158, 18, 1, "#566348");
  d.rect(264, flatGround ? 170 : 162, 13, 1, "#485640");
  ctx.restore();
}

/** 胞子と薄霧は静的な景観へ焼き込まず、コード版・画像版で同じ時間を使う。 */
export function drawForestBoundaryAtmosphere(d: Display, t: number): void {
  const ctx = d.ctx;
  ctx.save();
  // 決定的な配置の胞子。会話窓より上だけを漂う。
  for (let i = 0; i < 14; i++) {
    const x = (37 + i * 71) % SCREEN_W;
    const y = (29 + i * 41 - t * (2 + i % 3) + 150) % 150;
    ctx.globalAlpha = i % 5 === 0 ? 0.58 : 0.24;
    d.rect(Math.round(x), Math.round(y), i % 5 === 0 ? 2 : 1, 1,
      i % 5 === 0 ? PAL.accent : PAL.accentCool);
  }
  ctx.globalAlpha = 1;

  const fog = ctx.createLinearGradient(0, 110, 0, 182);
  fog.addColorStop(0, "rgba(109,157,142,0)");
  fog.addColorStop(1, "rgba(109,157,142,0.18)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 110, SCREEN_W, 72);
  ctx.restore();
}

/** 森入口の代表構図。静的な景観と、正確な足跡・環境演出を分ける。 */
export function renderForestEntrance(d: Display, t: number, o: ForestEntranceOptions = {}): void {
  const ctx = d.ctx;
  d.clear("#4d8584");
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, 166);
  sky.addColorStop(0, "#3d737a");
  sky.addColorStop(0.52, "#88b4a1");
  sky.addColorStop(1, "#b0c397");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, 176);

  // 遠景の樹冠。水平な帯ではなく、明るい空を間に残す大きな葉の塊。
  for (const [x, y, w, h, color] of [
    [-24, 14, 136, 54, "#427967"], [77, -12, 131, 52, "#55896c"],
    [186, 12, 92, 37, "#6a9874"], [282, -9, 142, 55, "#4c8066"],
    [388, 24, 122, 59, "#356a5b"],
  ] as const) {
    d.rect(x + 15, y, w - 32, h, color);
    d.rect(x, y + 11, w, h - 24, color);
    d.rect(x + 29, y + h - 4, w - 54, 9, color);
  }
  for (const [x, y, w] of [[104, 14, 40], [169, 32, 29], [304, 14, 42], [382, 38, 32]] as const) {
    d.rect(x, y, w, 4, "#9caa72");
    d.rect(x + 8, y + 4, w - 14, 3, "#7e9d6c");
  }

  // 奥ほど細く明るい幹。中央の抜けが人物と狼の輪郭を受け止める。
  for (const [x, top, w] of [[126, 48, 6], [169, 40, 7], [219, 58, 5], [272, 37, 6], [318, 51, 8], [364, 44, 7]] as const) {
    d.rect(x, top, w, 150 - top, "#658e79");
    d.rect(x + 1, top + 4, 2, 134 - top, "#8fab8c");
    d.rect(x - 9, top + 24, 13, 3, "#658e79");
  }
  d.rect(180, 136, 158, 12, "#84a280");
  d.rect(225, 131, 78, 6, "#9fb58c");

  // 左に白樹の境界を残す。帰り道と入口が同じ土地であることを示す。
  for (const [x, top, w] of [[42, 42, 10], [87, 23, 9]] as const) {
    d.rect(x, top, w, 153 - top, "#b5c4ac");
    d.rect(x + w - 3, top, 3, 153 - top, "#829b87");
    for (const y of [67, 102, 129]) d.rect(x + 1, y, w - 4, 2, "#748d7c");
  }

  // 中景の幹は左右へ寄せる。枝は頭上に収め、横移動の帯へ根を張り出させない。
  for (const [x, top, w, bottom] of [[-7, 0, 26, 160], [374, 28, 18, 153], [431, 0, 35, 164]] as const) {
    d.rect(x, top, w, bottom - top, "#284b3d");
    d.rect(x + 5, top, 5, bottom - top - 8, "#496c4f");
    d.rect(x + w - 7, top + 21, 5, bottom - top - 21, "#203f34");
    d.rect(x - 11, bottom - 7, w + 23, 7, "#365942");
  }
  d.rect(383, 48, 67, 7, "#284b3d");
  d.rect(408, 42, 43, 6, "#284b3d");
  d.rect(0, 66, 61, 7, "#31563f");

  // 路肩→踏まれた水平な道→手前の土。中央はジャンプ不要の連続した歩行帯。
  d.rect(0, 149, SCREEN_W, SCREEN_H - 149, "#4e7252");
  ctx.fillStyle = "#82936b";
  ctx.beginPath();
  ctx.moveTo(0, 161); ctx.lineTo(118, 157); ctx.lineTo(214, 162);
  ctx.lineTo(325, 157); ctx.lineTo(480, 165); ctx.lineTo(480, 194);
  ctx.lineTo(0, 192); ctx.closePath(); ctx.fill();
  d.rect(0, 176, SCREEN_W, SCREEN_H - 176, "#697b57");
  d.rect(0, 205, SCREEN_W, SCREEN_H - 205, "#506849");
  for (let i = 0; i < 22; i++) {
    const x = (17 + i * 53) % SCREEN_W;
    const y = 183 + (i * 17) % 71;
    d.rect(x, y, 7 + (i % 4) * 3, 1, i % 3 === 0 ? "#8c9766" : "#59714f");
  }

  // 調査点x=132の湿った土。靴跡二人分を獣が囲む配置は別レイヤー。
  d.rect(98, 157, 72, 22, "#647958");
  d.rect(106, 153, 51, 6, "#70815c");
  d.rect(108, 178, 45, 4, "#647958");
  if (o.tracks !== false) drawForestEntranceTracks(d);

  // 小さな生活圏の暖色がまだ残る。鮮色は両端の草花に限定する。
  for (const [x, y] of [[24, 160], [61, 153], [414, 158], [459, 162]] as const) {
    d.rect(x, y - 14, 2, 15, "#29563c");
    d.rect(x - 8, y - 11, 9, 3, "#6c9a61");
    d.rect(x + 2, y - 7, 10, 3, "#7eab68");
    d.rect(x - 6, y - 3, 8, 3, "#497d4e");
  }
  for (const [x, y, color] of [[30, 148, "#dfbf6b"], [70, 158, "#cf8770"], [409, 152, "#d8bd68"], [463, 149, "#9fc778"]] as const) {
    d.rect(x, y, 2, 7, "#365d40");
    d.rect(x - 1, y - 2, 4, 2, color);
  }
  // 前景は端と上隅。人物の足元176と会話窓182以降の境を読ませる。
  for (const [x, y, w] of [[0, 0, 56], [18, 12, 28], [421, 0, 59], [449, 16, 31]] as const) {
    d.rect(x, y, w, 16, "#173f33");
    d.rect(x + 5, y + 13, w - 12, 9, "#24543e");
  }

  if (o.atmosphere !== false) drawForestEntranceAtmosphere(d, t);
  ctx.restore();
}

/** 静的背景へ後載せする光・薄霧・粒子。DEVの生成候補にも同じ層を使う。 */
export function drawForestEntranceAtmosphere(d: Display, t: number): void {
  const ctx = d.ctx;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#eed393";
  ctx.beginPath();
  ctx.moveTo(140, 0); ctx.lineTo(184, 0); ctx.lineTo(264, 176); ctx.lineTo(181, 176);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(304, 39); ctx.lineTo(330, 39); ctx.lineTo(365, 175); ctx.lineTo(325, 175);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.09;
  d.rect(111, 139, 218, 3, "#d3ddbe");
  for (let i = 0; i < 10; i++) {
    const x = (31 + i * 71 + Math.sin(t * 0.4 + i) * 3) % SCREEN_W;
    const y = (34 + i * 37 - t * (1.2 + i % 2) + 144) % 144;
    ctx.globalAlpha = i % 4 === 0 ? 0.45 : 0.18;
    d.rect(Math.round(x), Math.round(y), i % 4 === 0 ? 2 : 1, 1, i % 4 === 0 ? PAL.accent : PAL.accentCool);
  }
  ctx.restore();
}

export function drawForestEntranceTracks(
  d: Display, colors = { sole: "#3d5945", paw: "#304d3d" },
): void {
  // 二列の靴跡は踵と長い爪先で区別する。獣の足跡は三つの爪と短い足裏。
  for (const [x, y] of [[112, 162], [125, 160], [139, 161], [116, 173], [130, 171], [145, 173]] as const) {
    d.rect(x, y, 5, 2, colors.sole);
    d.rect(x + 1, y + 3, 2, 1, colors.sole);
  }
  for (const [x, y] of [[94, 163], [105, 151], [130, 148], [156, 153], [174, 163], [159, 180], [134, 183], [105, 179]] as const) {
    d.rect(x, y, 2, 2, colors.paw);
    d.rect(x - 1, y - 2, 1, 1, colors.paw);
    d.rect(x + 1, y - 3, 1, 1, colors.paw);
    d.rect(x + 3, y - 2, 1, 1, colors.paw);
  }
}

/** 第二章の浅い森。共通の光を保ち、middle名で地形だけを変える。 */
export function renderShallowForest(d: Display, t: number, variant: string): void {
  if (variant === "edge") { renderForestEntrance(d, t); return; }
  const ctx = d.ctx;
  const theme = THEMES.forest;
  d.clear(theme.skyTop);
  ctx.save();

  const sky = ctx.createLinearGradient(0, 0, 0, 176);
  sky.addColorStop(0, "#23534f");
  sky.addColorStop(0.52, "#4f8369");
  sky.addColorStop(1, "#829675");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, 176);

  // 遠い樹冠を青緑・若葉・金の三段へ分け、暗い幹だけの森にしない。
  ctx.globalAlpha = 0.38;
  for (const [x, y, w, color] of [
    [-18, 11, 126, "#2f6d5d"], [78, 3, 142, "#4c8062"], [194, 17, 119, "#387260"],
    [287, 5, 137, "#588663"], [401, 20, 102, "#347064"],
  ] as const) {
    d.rect(x, y, w, 13, color);
    d.rect(x + 19, y + 10, w - 31, 9, color);
  }
  ctx.globalAlpha = 0.15;
  d.rect(99, 19, 68, 5, "#e0b957");
  d.rect(330, 24, 54, 4, "#d3c26f");
  ctx.globalAlpha = 1;

  // 遠景は同じ森として再利用し、中景の幹位置だけ各画面でずらす。
  const seed = [...variant].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  for (let i = 0; i < 13; i++) {
    const x = ((i * 43 + seed * 7) % 540) - 30;
    const h = 76 + ((seed + i * 29) % 62);
    ctx.globalAlpha = i % 3 === 0 ? 0.72 : 0.46;
    ctx.fillStyle = i % 2 === 0 ? theme.shadow : theme.foliage;
    ctx.fillRect(x, 176 - h, 11 + (i % 3) * 3, h);
    ctx.fillRect(x - 14, 65 + (i % 4) * 24, 46, 8);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#395640";
  ctx.fillRect(0, 150, SCREEN_W, SCREEN_H - 150);
  ctx.fillStyle = "#657153";
  ctx.beginPath();
  ctx.moveTo(0, 167);
  ctx.lineTo(SCREEN_W, 160 + (seed % 9));
  ctx.lineTo(SCREEN_W, SCREEN_H);
  ctx.lineTo(0, SCREEN_H);
  ctx.closePath();
  ctx.fill();

  // 木漏れ日は大きな面を二つだけ。歩行帯を明るくし、人物の足を読ませる。
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = PAL.accent;
  ctx.beginPath();
  ctx.moveTo(76, 0);
  ctx.lineTo(126, 0);
  ctx.lineTo(213, 176);
  ctx.lineTo(171, 176);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(335, 0);
  ctx.lineTo(365, 0);
  ctx.lineTo(407, 172);
  ctx.lineTo(378, 172);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  if (variant === "creek") {
    ctx.fillStyle = "#263d3b";
    ctx.beginPath();
    ctx.moveTo(0, 189);
    ctx.lineTo(198, 169);
    ctx.lineTo(330, 178);
    ctx.lineTo(SCREEN_W, 207);
    ctx.lineTo(SCREEN_W, 234);
    ctx.lineTo(315, 193);
    ctx.lineTo(190, 187);
    ctx.lineTo(0, 211);
    ctx.closePath();
    ctx.fill();
  } else if (variant === "bridge") {
    d.rect(184, 167, 120, 7, "#4a3e2c");
    for (let x = 188; x < 300; x += 18) d.rect(x, 162 + ((x / 18) % 2) * 3, 13, 4, "#82714b");
    d.rect(178, 150, 3, 27, "#6b5738");
    d.rect(306, 150, 3, 27, "#6b5738");
  } else if (variant === "camp") {
    ctx.fillStyle = "#4b4432";
    ctx.beginPath();
    ctx.moveTo(290, 168);
    ctx.lineTo(342, 117);
    ctx.lineTo(393, 168);
    ctx.closePath();
    ctx.fill();
    d.rect(337, 116, 4, 54, "#302b22");
    d.rect(91, 164, 34, 8, "#574834");
  } else if (variant === "hollow") {
    ctx.strokeStyle = "#6f8e6d";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(350, 132, 54, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = PAL.accentCool;
    ctx.globalAlpha = 0.32;
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (variant === "snare") {
    ctx.strokeStyle = "#7d6b47";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(245 + i * 16, 163, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 彩りは足元の端へ寄せる。人物の服へ色数を足さず、土地の豊かさを背景で出す。
  for (const [x, y, color] of [
    [18, 158, "#e0b957"], [47, 166, "#e57d69"], [91, 155, "#8fcf7c"],
    [392, 162, "#81d8bf"], [426, 154, "#d3a9df"], [458, 165, "#e1bb58"],
  ] as const) {
    d.rect(x, y, 2, 6, "#315c43");
    d.rect(x - 2, y - 2, 5, 2, color);
    d.rect(x, y - 4, 2, 2, color);
  }

  // 前景のシダ。中央の足元線には置かず、左右の奥行きだけを強める。
  for (const x of [7, 30, 438, 461]) {
    d.rect(x, 147, 3, 20, "#214a38");
    d.rect(x - 6, 151, 8, 3, "#4f835a");
    d.rect(x + 2, 156, 9, 3, "#6d9a62");
    d.rect(x - 5, 162, 8, 3, "#3f7350");
  }

  for (let i = 0; i < 12; i++) {
    const x = (seed + i * 73) % SCREEN_W;
    const y = (35 + i * 37 - t * (2 + i % 2) + 140) % 140;
    ctx.globalAlpha = i % 4 === 0 ? 0.5 : 0.2;
    d.rect(Math.round(x), Math.round(y), i % 4 === 0 ? 2 : 1, 1, PAL.accentCool);
  }
  ctx.globalAlpha = 1;

  // 近景の葉は左右端だけ。移動帯の中央と会話窓を塞がない。
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = "#102a22";
  for (const [x, y, w] of [[0, 18, 58], [0, 45, 37], [426, 23, 54], [447, 51, 33]] as const) {
    ctx.fillRect(x, y, w, 8);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** 第三章の深い森。浅森より光を絞り、白い根と左下がりの刻みを目印にする。 */
export function renderDeepForest(d: Display, t: number, variant: string): void {
  const ctx = d.ctx;
  d.clear("#071816");
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, 176);
  sky.addColorStop(0, "#091727");
  sky.addColorStop(0.44, "#123532");
  sky.addColorStop(0.76, "#1f4c40");
  sky.addColorStop(1, "#48634e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, 176);

  const seed = [...variant].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  for (let i = 0; i < 16; i++) {
    const x = ((i * 37 + seed * 5) % 530) - 24;
    const w = 10 + (i % 4) * 4;
    ctx.globalAlpha = 0.52 + (i % 3) * 0.12;
    ctx.fillStyle = i % 4 === 0 ? "#263f35" : "#0d2722";
    ctx.fillRect(x, 18 + (i % 3) * 9, w, 153);
    ctx.fillRect(x - 17, 44 + (i % 5) * 19, w + 43, 8);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#1f352a";
  ctx.fillRect(0, 151, SCREEN_W, SCREEN_H - 151);
  ctx.fillStyle = "#344a35";
  ctx.beginPath();
  ctx.moveTo(0, 173);
  ctx.lineTo(SCREEN_W, 159 + (seed % 8));
  ctx.lineTo(SCREEN_W, SCREEN_H);
  ctx.lineTo(0, SCREEN_H);
  ctx.closePath();
  ctx.fill();

  // 深層だけに残る記憶色。紫は大面積にせず、根の隙間へ小さな層として置く。
  ctx.globalAlpha = 0.20;
  d.rect(18, 118, 91, 5, "#67577f");
  d.rect(371, 132, 88, 4, "#71618b");
  ctx.globalAlpha = 1;

  // 白い根は守護域の境界記号。結び木では二重の輪も重ねる。
  ctx.strokeStyle = "#a5b9a6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(188, 171);
  ctx.bezierCurveTo(224, 148, 272, 181, 326, 151);
  ctx.stroke();
  if (variant === "knot") {
    // 正確な刻みと結び目はdrawKnotTreeClueへ分離し、fallbackも静景だけにする。
    d.rect(315, 47, 28, 119, "#253a30");
    d.rect(320, 47, 8, 119, "#344a36");
  } else if (variant === "entry") {
    // 地下へ曲がる太い根。縦線の森から、肋骨状の洞窟へ景色を切り替える。
    ctx.strokeStyle = "#718b6a";
    ctx.lineWidth = 11;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(84 + i * 92, 154, 54, Math.PI, Math.PI * 1.86);
      ctx.stroke();
    }
    d.rect(71, 129, 54, 4, "#9eaa8c");
    d.rect(78, 137, 40, 2, PAL.accentCool);
  } else if (variant === "echo_gallery") {
    // 反響する白い繊維。一定間隔の縦糸で、試練の回廊らしい人工感を足す。
    for (let i = 0; i < 9; i++) {
      const x = 34 + i * 54;
      ctx.globalAlpha = 0.35 + (i % 3) * 0.12;
      ctx.strokeStyle = i % 2 === 0 ? "#b7c4ad" : PAL.accentCool;
      ctx.lineWidth = i % 2 === 0 ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 26 + (i % 3) * 8);
      ctx.bezierCurveTo(x - 12, 78, x + 14, 116, x - 3, 169);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (variant === "root_heart") {
    // 守護樹の心部。明滅は弱く、鼓動よりも呼吸に見える速度にする。
    const pulse = 0.42 + Math.sin(t * 1.7) * 0.08;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PAL.accentCool;
    ctx.beginPath();
    ctx.ellipse(352, 92, 38, 49, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#aebfa8";
    ctx.lineWidth = 9;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(352, 119);
      ctx.bezierCurveTo(296 + i * 30, 140, 265 + i * 47, 157, 228 + i * 58, 174);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 10; i++) {
    const x = (seed * 3 + i * 83) % SCREEN_W;
    const y = (27 + i * 31 - t * (1.4 + i % 2) + 132) % 132;
    ctx.globalAlpha = i % 4 === 0 ? 0.42 : 0.14;
    d.rect(Math.round(x), Math.round(y), i % 4 === 0 ? 2 : 1, 1, PAL.accentCool);
  }

  // 深層の低い菌糸光。上からの光を増やさず、足元にだけ冷色を返す。
  ctx.globalAlpha = 0.36;
  for (const [x, y, color] of [
    [26, 164, "#76d8c1"], [55, 171, "#b9a9e6"], [414, 166, "#76d8c1"], [446, 158, "#d2a9d9"],
  ] as const) {
    d.rect(x, y, 7, 2, color);
    d.rect(x + 2, y - 3, 2, 3, color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** 遺跡外縁。森の不規則な線に対し、王国の校訂印だけを直線で見せる。 */
export function renderRuinExterior(d: Display, t: number, variant: string): void {
  const ctx = d.ctx;
  const theme = THEMES.ruin;
  d.clear(theme.skyTop);
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, 176);
  sky.addColorStop(0, "#151a2d");
  sky.addColorStop(0.65, "#34435a");
  sky.addColorStop(1, "#52635f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, 176);
  ctx.fillStyle = "#1d2930";
  for (let i = 0; i < 9; i++) {
    const x = 16 + i * 61;
    const h = 42 + (i * 23) % 64;
    ctx.fillRect(x, 158 - h, 34, h);
    if (i % 2 === 0) ctx.fillRect(x - 6, 158 - h, 46, 7);
  }
  ctx.fillStyle = "#394550";
  ctx.fillRect(0, 157, SCREEN_W, SCREEN_H - 157);
  ctx.fillStyle = "#566171";
  ctx.fillRect(0, 174, SCREEN_W, 5);
  // 欠けた石と冷たい斜光。均一な壁面へ、遺跡の奥行きを一段だけ加える。
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = theme.ambient;
  ctx.beginPath();
  ctx.moveTo(292, 0);
  ctx.lineTo(335, 0);
  ctx.lineTo(278, 176);
  ctx.lineTo(244, 176);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.34;
  for (const [x, y, w] of [[21, 168, 14], [118, 164, 9], [416, 170, 18], [451, 161, 8]] as const) {
    d.rect(x, y, w, 2, "#71809a");
  }
  ctx.globalAlpha = 1;
  if (variant === "courtyard") {
    d.rect(286, 91, 104, 70, "#2c3745");
    d.frame(286, 91, 104, 70, "#71809a");
    for (let y = 105; y < 153; y += 15) d.rect(294, y, 87, 2, "#4d5a6c");
    d.rect(327, 111, 22, 38, "#151d29");
  } else {
    d.rect(338, 63, 82, 99, "#25313e");
    d.frame(338, 63, 82, 99, "#66758d");
    d.rect(363, 94, 31, 68, "#101722");
  }
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.fog;
  for (let i = 0; i < 5; i++) {
    const x = ((i * 127 + t * 3) % 590) - 80;
    ctx.fillRect(x, 128 + i * 10, 105, 2);
  }
  ctx.restore();
}

/** 遺跡内部。用途ごとに中央の機構だけを変え、石壁の規格を共有する。 */
export function renderRuinInterior(d: Display, t: number, variant: string): void {
  const ctx = d.ctx;
  const theme = THEMES.ruin;
  d.clear(theme.shadow);
  ctx.save();
  const wall = ctx.createLinearGradient(0, 0, 0, 176);
  wall.addColorStop(0, "#171d35");
  wall.addColorStop(0.56, "#27344a");
  wall.addColorStop(1, "#39485a");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, SCREEN_W, 176);
  for (let x = 0; x < SCREEN_W; x += 48) {
    d.frame(x, 20 + ((x / 48) % 2) * 7, 45, 42, "#3e4b61");
    d.frame(x - 20, 66 + ((x / 48) % 3) * 5, 58, 39, "#343f54");
  }
  ctx.fillStyle = "#343d50";
  ctx.fillRect(0, 151, SCREEN_W, SCREEN_H - 151);
  d.rect(0, 174, SCREEN_W, 5, "#667188");
  // 王国以前の古金と、現在も動く校訂光。規則的に離して置く。
  ctx.globalAlpha = 0.42;
  for (const x of [28, 154, 326, 452]) {
    d.rect(x, 31 + (x % 3) * 19, 3, 16, "#b99a61");
    d.rect(x - 2, 31 + (x % 3) * 19, 7, 3, "#d3b56f");
  }
  ctx.globalAlpha = 0.22;
  d.rect(0, 119, 126, 4, "#6ca99e");
  d.rect(354, 109, 126, 4, "#8278a8");
  ctx.globalAlpha = 1;

  if (variant === "archive") {
    for (const x of [72, 136, 344, 408]) {
      d.rect(x, 70, 32, 89, "#171f2c");
      d.frame(x, 70, 32, 89, "#59667c");
      for (let y = 82; y < 148; y += 17) d.rect(x + 4, y, 24, 3, "#7d6d59");
    }
  } else if (variant === "gallery") {
    for (const x of [85, 175, 305, 395]) {
      d.rect(x, 38, 6, 124, "#59667c");
      d.rect(x - 10, 36, 26, 6, "#78869d");
    }
    d.rect(244, 93, 48, 37, "#151c29");
    d.frame(244, 93, 48, 37, PAL.accentCool);
  } else if (variant === "core") {
    ctx.strokeStyle = PAL.accentCool;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.58 + Math.sin(t * 2) * 0.1;
    ctx.beginPath();
    ctx.arc(352, 104, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(352, 104, 27, 0, Math.PI * 2);
    ctx.stroke();
    d.rect(348, 86, 8, 38, "#b9a9e6");
    ctx.globalAlpha = 1;
  } else if (variant === "workshop") {
    d.rect(272, 118, 138, 10, "#697489");
    d.rect(286, 128, 8, 34, "#3f485b");
    d.rect(389, 128, 8, 34, "#3f485b");
    ctx.strokeStyle = PAL.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(342, 91, 18, 0, Math.PI * 2);
    ctx.stroke();
    d.rect(338, 66, 8, 10, "#b9a9e6");
  } else if (variant === "garden") {
    ctx.fillStyle = "#263c38";
    ctx.fillRect(0, 132, SCREEN_W, 44);
    for (let i = 0; i < 18; i++) {
      const x = 16 + i * 27;
      const h = 7 + (i * 11) % 17;
      d.rect(x, 165 - h, 2, h, "#6e927e");
      d.rect(x - 3, 154 - h, 8, 5, i % 3 === 0 ? "#d8d6cc" : "#8faf9a");
    }
    d.rect(330, 72, 48, 42, "#59667c");
    d.frame(330, 72, 48, 42, PAL.accentCool);
  } else if (variant === "overlook") {
    d.rect(270, 42, 158, 103, "#101923");
    d.frame(270, 42, 158, 103, "#68768b");
    ctx.fillStyle = "#25483e";
    ctx.beginPath();
    ctx.moveTo(274, 126);
    ctx.lineTo(328, 87);
    ctx.lineTo(375, 117);
    ctx.lineTo(424, 74);
    ctx.lineTo(424, 141);
    ctx.lineTo(274, 141);
    ctx.closePath();
    ctx.fill();
    d.rect(283, 123, 7, 18, "#b9c4b2");
    d.rect(399, 110, 7, 31, "#b9c4b2");
  } else if (variant === "sanctum") {
    ctx.strokeStyle = PAL.accentCool;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.44 + Math.sin(t * 1.8) * 0.08;
    for (const radius of [26, 48, 74]) {
      ctx.beginPath();
      ctx.arc(350, 101, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    d.rect(344, 49, 12, 104, "#b9a9e6");
    d.rect(298, 97, 104, 8, "#b9a9e6");
  }

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = theme.fog;
  for (let i = 0; i < 6; i++) {
    const x = ((i * 101 + t * (2 + i * 0.2)) % 570) - 70;
    ctx.fillRect(x, 124 + i * 8, 84, 2);
  }
  ctx.restore();
}

/** 第二章の敵シンボル用仮素材。完成敵絵へ置換しても足元位置は変えない。 */
export function drawForestEnemy(
  d: Display, cx: number, bottom: number, t: number, enemyId: string, facing: -1 | 1 = 1,
): void {
  if (facing < 0) {
    // 足元の中心だけを軸に反転する。戦闘・従来の比較画面は既定の右向きを維持。
    d.ctx.save();
    d.ctx.translate(cx * 2, 0);
    d.ctx.scale(-1, 1);
    drawForestEnemy(d, cx, bottom, t, enemyId);
    d.ctx.restore();
    return;
  }
  const bob = Math.sin(t * 2.4 + cx) * 1.2;
  const y = bottom + bob;
  const ctx = d.ctx;
  const shadowRadius = enemyId === "root_warden" ? 37
    : enemyId === "nameless_choir" ? 46
      : enemyId === "seal_sentinel" ? 24
        : enemyId === "moss_wolf" || enemyId === "hush_moth" || enemyId === "hollow_boar" ? 28
          : enemyId === "white_antler" || enemyId === "name_leech" || enemyId === "blank_scribe" ? 23
          : 18;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, bottom + 2, shadowRadius, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (enemyId === "moss_wolf") {
    // 背中の苔、低い頭、水平な尾で「森から追い返す狼」を読む。
    d.rect(cx - 27, y - 24, 10, 5, "#263c31");
    d.rect(cx - 32, y - 28, 8, 4, "#314c3b");
    d.rect(cx - 21, y - 25, 39, 19, "#253a30");
    d.rect(cx - 18, y - 27, 34, 16, "#55745a");
    d.rect(cx - 13, y - 31, 7, 5, "#86a06d");
    d.rect(cx - 3, y - 33, 9, 7, "#759365");
    d.rect(cx + 10, y - 35, 6, 9, "#91aa78");
    d.rect(cx + 10, y - 29, 18, 18, "#6f8d68");
    d.rect(cx + 13, y - 35, 5, 8, "#9daf84");
    d.rect(cx + 23, y - 33, 4, 7, "#9daf84");
    d.rect(cx + 26, y - 22, 7, 6, "#405d49");
    d.rect(cx - 16, y - 10, 6, 10, "#25392e");
    d.rect(cx + 8, y - 10, 6, 10, "#25392e");
    d.rect(cx + 22, y - 25, 2, 2, PAL.accentCool);
  } else if (enemyId === "snare_vine") {
    // 狩人の罠を取り込んだ、結び目から四方へ道を縫う蔓。
    d.rect(cx - 11, y - 17, 22, 16, "#263d2b");
    d.rect(cx - 8, y - 20, 16, 17, "#6f8757");
    d.rect(cx - 4, y - 16, 8, 8, "#a6a36d");
    d.rect(cx - 31, y - 8, 22, 5, "#426447");
    d.rect(cx - 31, y - 22, 5, 18, "#426447");
    d.rect(cx - 28, y - 25, 15, 5, "#78925e");
    d.rect(cx + 9, y - 10, 25, 5, "#426447");
    d.rect(cx + 29, y - 28, 5, 22, "#426447");
    d.rect(cx + 16, y - 31, 18, 5, "#78925e");
    d.rect(cx - 8, y - 39, 5, 21, "#526f49");
    d.rect(cx - 8, y - 42, 21, 5, "#78925e");
    d.rect(cx + 9, y - 41, 5, 17, "#526f49");
    d.rect(cx - 22, y - 17, 5, 5, "#b9a36b");
  } else if (enemyId === "hush_moth") {
    // 左右の翼を大きな色面にし、囁き粉だけを青緑の一点光にする。
    d.rect(cx - 5, y - 34, 10, 30, "#344b47");
    d.rect(cx - 27, y - 31, 20, 7, "#405c55");
    d.rect(cx - 24, y - 37, 17, 23, "#789185");
    d.rect(cx - 20, y - 40, 13, 7, "#91a89a");
    d.rect(cx + 7, y - 37, 17, 23, "#789185");
    d.rect(cx + 7, y - 40, 13, 7, "#91a89a");
    d.rect(cx + 7, y - 31, 20, 7, "#405c55");
    d.rect(cx - 18, y - 30, 7, 7, "#b7b878");
    d.rect(cx + 11, y - 30, 7, 7, "#b7b878");
    d.rect(cx - 16, y - 28, 3, 3, PAL.accentCool);
    d.rect(cx + 13, y - 28, 3, 3, PAL.accentCool);
    d.rect(cx - 2, y - 39, 2, 5, "#a7b8a8");
    d.rect(cx + 2, y - 41, 2, 7, "#a7b8a8");
    d.rect(cx - 29, y - 16, 2, 2, PAL.accentCool);
    d.rect(cx + 27, y - 12, 2, 2, PAL.accentCool);
  } else if (enemyId === "hollow_boar") {
    // 樹洞の輪を大きな鼻面に持つ、重く低い四角形。
    d.rect(cx - 29, y - 29, 48, 24, "#302b23");
    d.rect(cx - 25, y - 32, 45, 24, "#665a45");
    d.rect(cx - 18, y - 36, 24, 6, "#867554");
    d.rect(cx + 14, y - 35, 21, 26, "#6d6049");
    d.rect(cx + 19, y - 30, 17, 16, "#423a2d");
    d.rect(cx + 23, y - 27, 10, 10, "#817356");
    d.rect(cx + 31, y - 19, 9, 3, "#d2c79e");
    d.rect(cx + 30, y - 32, 2, 2, PAL.accent);
    d.rect(cx - 22, y - 11, 7, 11, "#2b281f");
    d.rect(cx + 5, y - 11, 7, 11, "#2b281f");
    d.rect(cx - 33, y - 27, 5, 12, "#4c4234");
  } else if (enemyId === "root_warden") {
    // 人型の幹ではなく、根が一時的に門の形を取った横広の番人。
    d.rect(cx - 28, y - 58, 56, 49, "#213729");
    d.rect(cx - 23, y - 62, 46, 48, "#435e43");
    d.rect(cx - 15, y - 68, 30, 39, "#607b5b");
    d.rect(cx - 8, y - 78, 16, 18, "#76906a");
    d.rect(cx - 39, y - 67, 25, 8, "#516d4d");
    d.rect(cx - 44, y - 73, 10, 8, "#728d64");
    d.rect(cx + 14, y - 67, 25, 8, "#516d4d");
    d.rect(cx + 34, y - 74, 10, 9, "#728d64");
    d.rect(cx - 13, y - 48, 6, 3, PAL.accentCool);
    d.rect(cx + 7, y - 48, 6, 3, PAL.accentCool);
    d.rect(cx - 31, y - 18, 12, 18, "#304934");
    d.rect(cx + 19, y - 18, 12, 18, "#304934");
    d.rect(cx - 43, y - 6, 22, 6, "#263d2c");
    d.rect(cx + 21, y - 6, 22, 6, "#263d2c");
    d.rect(cx - 5, y - 82, 3, 8, "#9aad82");
    d.rect(cx + 4, y - 85, 3, 11, "#9aad82");
  } else if (enemyId === "white_antler") {
    // 細い脚と白い枝角。白樹の獣より軽く、退路を作る縦長の姿勢。
    d.rect(cx - 23, y - 31, 42, 19, "#40574c");
    d.rect(cx - 19, y - 34, 36, 18, "#738679");
    d.rect(cx + 11, y - 43, 16, 29, "#aebcac");
    d.rect(cx + 18, y - 47, 12, 10, "#c6d0c0");
    d.rect(cx - 15, y - 16, 5, 16, "#354a40");
    d.rect(cx + 7, y - 16, 5, 16, "#354a40");
    d.rect(cx + 17, y - 58, 3, 13, "#d3d9c8");
    d.rect(cx + 11, y - 60, 9, 3, "#d3d9c8");
    d.rect(cx + 10, y - 65, 3, 8, "#d3d9c8");
    d.rect(cx + 25, y - 56, 3, 11, "#d3d9c8");
    d.rect(cx + 25, y - 58, 8, 3, "#d3d9c8");
    d.rect(cx + 31, y - 62, 3, 7, "#d3d9c8");
    d.rect(cx + 25, y - 43, 2, 2, PAL.accentCool);
  } else if (enemyId === "name_leech") {
    // 曲線ではなく、欠けた名札をつなぐ紫の段差として這わせる。
    const segments = [
      [-30, -9], [-24, -18], [-17, -29], [-7, -34], [4, -29], [15, -22], [22, -32], [17, -43], [8, -50],
    ] as const;
    for (const [ox, oy] of segments) d.rect(cx + ox, y + oy, 11, 9, "#6d5877");
    d.rect(cx - 25, y - 16, 7, 4, "#9a7e9e");
    d.rect(cx - 5, y - 31, 7, 4, "#9a7e9e");
    d.rect(cx + 18, y - 29, 7, 4, "#9a7e9e");
    d.rect(cx + 11, y - 52, 7, 4, PAL.accent);
    d.rect(cx - 13, y - 27, 5, 2, "#d0c3d3");
    d.rect(cx + 8, y - 25, 5, 2, "#d0c3d3");
  } else if (enemyId === "seal_sentinel") {
    // 王国の校訂印を、頭より大きな胸の正方形として見せる。
    d.rect(cx - 22, y - 54, 44, 47, "#283342");
    d.rect(cx - 27, y - 50, 9, 31, "#44536a");
    d.rect(cx + 18, y - 50, 9, 31, "#44536a");
    d.rect(cx - 16, y - 61, 32, 14, "#59677b");
    d.rect(cx - 11, y - 44, 22, 23, "#8794aa");
    d.rect(cx - 8, y - 41, 16, 17, "#bac0c0");
    d.rect(cx - 5, y - 38, 10, 11, "#506276");
    d.rect(cx - 2, y - 36, 4, 7, PAL.accentCool);
    d.rect(cx - 13, y - 12, 10, 12, "#202a37");
    d.rect(cx + 3, y - 12, 10, 12, "#202a37");
  } else if (enemyId === "blank_scribe") {
    // 白紙の顔、裾へ重なる頁、一本だけ長い空筆。
    d.rect(cx - 20, y - 51, 40, 45, "#303342");
    d.rect(cx - 16, y - 56, 32, 50, "#777783");
    d.rect(cx - 11, y - 49, 22, 16, "#c4c1bb");
    d.rect(cx - 8, y - 46, 16, 2, "#e1ddd1");
    d.rect(cx - 15, y - 25, 30, 5, "#9996a0");
    d.rect(cx - 15, y - 16, 30, 5, "#8a8790");
    d.rect(cx - 13, y - 8, 10, 8, "#343644");
    d.rect(cx + 3, y - 8, 10, 8, "#343644");
    d.rect(cx + 20, y - 62, 4, 58, "#bd9b66");
    d.rect(cx + 18, y - 64, 8, 5, "#d5c07f");
  } else if (enemyId === "nameless_choir") {
    // 個体の群れではなく、欠けた複数の記録が一枚の壁を作る。
    const choir = [
      { ox: -36, top: -55, coat: "#50586c" },
      { ox: -19, top: -66, coat: "#666b80" },
      { ox: 0, top: -72, coat: "#596174" },
      { ox: 19, top: -64, coat: "#707389" },
      { ox: 36, top: -53, coat: "#4d5669" },
    ];
    for (const voice of choir) {
      d.rect(cx + voice.ox - 8, y + voice.top + 12, 16, -voice.top - 17, "#303746");
      d.rect(cx + voice.ox - 6, y + voice.top + 14, 12, -voice.top - 23, voice.coat);
      d.rect(cx + voice.ox - 7, y + voice.top, 14, 14, "#bbb8c4");
      d.rect(cx + voice.ox - 4, y + voice.top + 5, 8, 2, "#716f7a");
    }
    d.rect(cx - 40, y - 18, 80, 5, "#363d4d");
    for (const ox of [-29, -10, 10, 29]) d.rect(cx + ox, y - 21, 2, 11, PAL.accentCool);
  } else if (enemyId === "sena_guardian") {
    // 最終戦前のシンボルも会話時の人物と同じ素体を使う。
    // 巨大なボス絵へせず、主人公と同じ人間の縮尺に置くことが物語上重要。
    drawStoryPerson(d, cx, y, "guardian", -1, false, {
      mode: "idle",
      frame: Math.floor(t / 0.72) % 2,
    });
  } else if (enemyId === "echo_target") {
    // 生物に見せず、根洞窟に固定された反響板と土台として描く。
    d.rect(cx - 6, y - 56, 12, 50, "#4d5e50");
    d.rect(cx - 24, y - 59, 48, 8, "#9eaa8c");
    d.rect(cx - 20, y - 56, 40, 3, "#536b59");
    d.rect(cx - 16, y - 47, 32, 28, "#2f473d");
    d.rect(cx - 12, y - 43, 24, 20, "#829487");
    d.rect(cx - 8, y - 39, 16, 12, "#40594c");
    d.rect(cx - 5, y - 36, 10, 6, PAL.accentCool);
    d.rect(cx - 18, y - 7, 36, 7, "#35493c");
    d.rect(cx - 23, y - 3, 46, 3, "#263a30");
  } else {
    d.rect(cx - 16, y - 28, 32, 27, "#607c69");
    d.frame(cx - 16, y - 28, 32, 27, PAL.accentCool);
  }
}

export function drawStoryPerson(
  d: Display, cx: number, bottom: number, kind: StoryPersonKind,
  facing: -1 | 1 = 1, carryingSack = false, motion?: StoryPersonMotion,
): void {
  const adult = kind !== "heroChild" && kind !== "senaChild";
  const heroAdult = kind === "heroAdult";
  const heroChild = kind === "heroChild";
  const sena = kind === "senaChild";
  const keeper = kind === "keeper";
  const villager = kind === "villager";
  const hunter = kind === "hunter";
  const merchant = kind === "merchant";
  const guardian = kind === "guardian";
  const senaAdult = kind === "sena";
  const ctx = d.ctx;

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, bottom + 1, adult ? 12 : 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottom));
  ctx.scale(facing, 1);

  const skin = "#d9b184";
  const hair = heroChild ? HERO_HAIR.child : keeper ? "#b8b4a5" : hunter ? "#252b27" : guardian || senaAdult ? "#172724" : merchant ? "#5a3d2d" : sena ? "#1c302d" : "#3c3026";
  const coat = keeper ? "#6e8064" : hunter ? "#3e5a43" : guardian ? "#203c35" : senaAdult ? "#315f5a" : merchant ? "#6a4666" : villager ? "#6f5942" : sena ? "#315f5a" : adult ? "#8a744c" : "#9b7c45";
  const trim = keeper ? "#d3b56f" : hunter ? "#89a078" : merchant ? "#d4a866" : guardian || sena || senaAdult ? PAL.accentCool : "#d6b967";
  const pants = hunter ? "#26352c" : keeper ? "#3d4c43" : merchant ? "#342d3a" : "#283b35";
  const head = adult ? 10 : 9;
  const leg = adult ? 12 : 9;
  const torso = adult ? 19 : 15;
  const npcIdleFrame = motion?.mode === "idle" ? Math.abs(motion.frame) % 2 : 0;

  if (hunter && motion?.injured) {
    // 腰を落とし、伸ばした脚を片手でかばう。色は通常の狩人と共通。
    d.rect(-8, -10, 14, 8, pants);
    d.rect(3, -6, 13, 5, pants);
    d.rect(14, -4, 7, 4, "#1b2622");
    d.rect(-8, -3, 8, 3, "#1b2622");
    d.rect(-9, -25, 15, 16, coat);
    d.rect(-7, -23, 12, 2, trim);
    d.rect(-11, -21, 4, 16, coat);
    d.rect(-11, -6, 5, 4, skin);
    d.rect(4, -20, 4, 10, coat);
    d.rect(5, -12, 7, 4, skin);
    d.rect(-3, -33, 10, 10, skin);
    d.rect(-5, -36, 13, 4, "#1b2b25");
    d.rect(-6, -34, 4, 8, "#20352c");
    d.rect(4, -28, 2, 1, "#19201d");
    // 弓は地面へ置き、通常の構えと区別する。
    d.rect(-15, -2, 18, 1, "#c1b08a");
    d.rect(-16, -3, 4, 2, "#8d7046");
    d.rect(-12, -5, 10, 2, "#a58450");
    d.rect(-2, -3, 5, 2, "#8d7046");
  } else if (heroAdult) {
    // 茶髪と素朴な衣装を維持し、襟巻き・鞄・膝の補修で村の生活感を残す。
    // 明るい生成りを大きく置き、暗い背景でも顔と胴を一続きに沈ませない。
    const hairShadow = HERO_HAIR.shadow;
    const hairMid = HERO_HAIR.base;
    const hairLight = HERO_HAIR.highlight;
    const tunicShadow = "#6d654e";
    const tunic = "#a99b75";
    const tunicLight = "#cdbf95";
    const scarfShadow = "#315144";
    const scarf = "#527760";
    const scarfLight = "#82a273";
    const trouserShadow = "#25332f";
    const trouser = "#3c4d46";
    const boot = "#302820";
    const leather = "#765033";

    const mode = motion?.mode ?? "idle";
    const idleFrame = mode === "idle" ? Math.abs(motion?.frame ?? 0) % 2 : 0;
    const walkFrame = mode === "walk" ? Math.abs(motion?.frame ?? 0) % 4 : 0;
    const walkPose = [
      { backLegX: -6, frontLegX: 3, backBootX: -7, frontBootX: 3, backArmY: 1, frontArmY: -1 },
      { backLegX: -4, frontLegX: 1, backBootX: -5, frontBootX: 1, backArmY: 0, frontArmY: 0 },
      { backLegX: 2, frontLegX: -5, backBootX: 2, frontBootX: -6, backArmY: -1, frontArmY: 1 },
      { backLegX: 0, frontLegX: -3, backBootX: 0, frontBootX: -4, backArmY: 0, frontArmY: 0 },
    ][walkFrame]!;
    // 中間の二コマだけ胴を1px上げ、脚を同じぶん伸ばす。靴底は動かさない。
    const bodyLift = mode === "walk" && walkFrame % 2 === 1 ? -1 : 0;
    const backLegX = mode === "walk" ? walkPose.backLegX : -5;
    const frontLegX = mode === "walk" ? walkPose.frontLegX : 2;
    const backBootX = mode === "walk" ? walkPose.backBootX : -6;
    const frontBootX = mode === "walk" ? walkPose.frontBootX : 2;
    const backArmY = mode === "walk" ? walkPose.backArmY : 0;
    const frontArmY = mode === "walk" ? walkPose.frontArmY : 0;

    // 後ろ脚、前脚、靴。前脚の大きな補修は遠目の識別点にする。
    d.rect(backLegX, -13 + bodyLift, 5, 12 - bodyLift, trouserShadow);
    d.rect(frontLegX, -14 + bodyLift, 6, 13 - bodyLift, trouser);
    d.rect(backBootX, -4, 7, 4, boot);
    d.rect(frontBootX, -4, 7, 4, boot);
    d.rect(backBootX, -1, 8, 1, "#151c19");
    d.rect(frontBootX, -1, 8, 1, "#151c19");
    d.rect(frontLegX + 1, -11 + bodyLift, 4, 5, "#b87d4d");
    d.rect(frontLegX + 2, -10 + bodyLift, 3, 1, "#d5a565");

    // 肩掛け鞄は身体の後ろ側へ出し、輪郭だけで旅立つ青年と分かるようにする。
    d.rect(-12, -28 + bodyLift, 6, 15, "#4d3528");
    d.rect(-11, -27 + bodyLift, 6, 13, leather);
    d.rect(-10, -25 + bodyLift, 4, 1, "#b0804d");

    // 生成りの短衣。裾を一段ずらして硬い長方形を避ける。
    d.rect(-7, -32 + bodyLift, 15, 18, tunicShadow);
    d.rect(-6, -31 + bodyLift, 14, 15, tunic);
    d.rect(-4, -30 + bodyLift, 9 + idleFrame, 2, tunicLight);
    d.rect(-8, -17 + bodyLift, 17, 3, tunicShadow);
    d.rect(-6, -14 + bodyLift, 6, 2, tunic);
    d.rect(3, -14 + bodyLift, 6, 2, tunic);
    // 鞄の帯は胸を斜めに横切る2pxだけ。細線の描き込みにしない。
    d.rect(-5, -31 + bodyLift, 2, 5, "#8f6843");
    d.rect(-3, -27 + bodyLift, 2, 5, "#8f6843");
    d.rect(-1, -23 + bodyLift, 2, 6, "#8f6843");

    // 腕は前後で明度を変え、横向きの姿勢を読む。
    d.rect(-10, -29 + bodyLift + backArmY, 4, 14, tunicShadow);
    d.rect(8, -28 + bodyLift + frontArmY, 4, 13, tunic);
    d.rect(-10, -17 + bodyLift + backArmY, 4, 4, "#b97d5f");
    d.rect(8, -17 + bodyLift + frontArmY, 4, 4, skin);

    // 短い苔色の襟巻き。後ろへ一枚だけ尾を出す。
    d.rect(-10, -35 + bodyLift, 8, 5, scarfShadow);
    d.rect(-7, -34 + bodyLift, 16, 5, scarf);
    d.rect(-3, -34 + bodyLift, 10, 1, scarfLight);
    const scarfTailY = -31 + bodyLift + (mode === "idle" ? idleFrame : (walkFrame === 2 ? 1 : 0));
    d.rect(-9, scarfTailY, 4, 9, scarfShadow);
    d.rect(-8, scarfTailY + 1, 3, 5, scarf);

    // 小さな横顔。鼻先と髪の跳ねだけで進行方向が分かる。
    d.rect(-4, -44 + bodyLift, 10, 11, "#b97d5f");
    d.rect(-3, -43 + bodyLift, 10, 9, skin);
    d.rect(6, -39 + bodyLift, 2, 2, skin);
    d.rect(-6, -46 + bodyLift, 11, 5, hairShadow);
    d.rect(-4, -45 + bodyLift, 11, 4, hairMid);
    d.rect(-6, -42 + bodyLift, 3, 7, hairMid);
    d.rect(-8, -44 + bodyLift, 3, 3, hairShadow);
    d.rect(-3, -46 + bodyLift, 4, 1, hairLight);
    d.rect(4, -39 + bodyLift, 1, 1, "#17211d");
  } else if (guardian || senaAdult || sena) {
    // セナは長髪、細い上衣、左手の三要素。仮面の有無でも同一人物に見せる。
    const childScale = adult ? 0 : 3;
    const top = adult ? -45 : -38;
    const bodyTop = adult ? -32 : -27;
    const bodyBottom = adult ? -13 : -10;
    const hairShadow = "#12211f";
    const hairMid = "#23403a";
    const clothShadow = "#244b46";
    const cloth = "#3f746b";
    const clothLight = "#69a18e";
    const mode = motion?.mode ?? "idle";
    const idleFrame = mode === "idle" ? Math.abs(motion?.frame ?? 0) % 2 : 0;
    const walkFrame = mode === "walk" ? Math.abs(motion?.frame ?? 0) % 4 : 0;
    const walkPose = [
      { backLegX: -5, frontLegX: 2, backBootX: -6, frontBootX: 2, backArmY: 1, ringArmY: -1 },
      { backLegX: -4, frontLegX: 1, backBootX: -5, frontBootX: 1, backArmY: 0, ringArmY: 0 },
      { backLegX: 1, frontLegX: -4, backBootX: 1, frontBootX: -5, backArmY: -1, ringArmY: 1 },
      { backLegX: 0, frontLegX: -3, backBootX: 0, frontBootX: -4, backArmY: 0, ringArmY: 0 },
    ][walkFrame]!;
    const bodyLift = mode === "walk" && walkFrame % 2 === 1 ? -1 : 0;
    const backLegX = mode === "walk" ? walkPose.backLegX : -5;
    const frontLegX = mode === "walk" ? walkPose.frontLegX : 2;
    const backBootX = mode === "walk" ? walkPose.backBootX : -6;
    const frontBootX = mode === "walk" ? walkPose.frontBootX : 2;
    const backArmY = mode === "walk" ? walkPose.backArmY : 0;

    const backLegTop = adult ? -13 : -10;
    const frontLegTop = adult ? -14 : -11;
    d.rect(backLegX, backLegTop + bodyLift, 5, -backLegTop - 1 - bodyLift, "#20322e");
    d.rect(frontLegX, frontLegTop + bodyLift, 5, -frontLegTop - 1 - bodyLift, "#30443e");
    d.rect(backBootX, -3, 7, 3, "#17211f");
    d.rect(frontBootX, -3, 7, 3, "#17211f");
    // 髪を背中側へ流し、仮面を外してもシルエットを保つ。
    const hairSway = mode === "walk" ? (walkFrame === 0 ? -1 : walkFrame === 2 ? 1 : 0) : idleFrame;
    d.rect(-10 - hairSway, top + 3 + bodyLift, 7, adult ? 27 : 22, hairShadow);
    d.rect(-12 - hairSway, top + 9 + bodyLift, 5, adult ? 23 : 18, hairMid);
    d.rect(-10 - hairSway, top + 20 + bodyLift, 3, adult ? 15 : 10, hairShadow);
    d.rect(-8, bodyTop + bodyLift, 16, bodyBottom - bodyTop, clothShadow);
    d.rect(-6, bodyTop + 1 + bodyLift, 14, bodyBottom - bodyTop - 3, cloth);
    d.rect(-4, bodyTop + 2 + bodyLift, 9 + idleFrame, 2, clothLight);
    d.rect(-9, bodyBottom - 2 + bodyLift, 18, 4, clothShadow);
    d.rect(-10, bodyTop + 3 + bodyLift + backArmY, 4, adult ? 15 : 12, clothShadow);
    // 指輪側の腕は後で非反転の左手を重ねるため、袖だけをここへ描く。
    const ringLower = Math.round(Math.max(0, Math.min(1, motion?.ringHandLower ?? 0)) * (adult ? 3 : 2));
    d.rect(
      8,
      bodyTop + 3 + bodyLift + (mode === "walk" ? walkPose.ringArmY : 0),
      4,
      (adult ? 15 : 12) + ringLower,
      cloth,
    );

    if (guardian) {
      d.rect(-5, top + bodyLift, 11, 12, "#869687");
      d.rect(-4, top + 1 + bodyLift, 11, 9, "#c9c9ad");
      d.rect(-3, top + 2 + bodyLift, 8, 2, "#e6dfc2");
      d.rect(4, top + 6 + bodyLift, 2, 2, "#18302b");
      d.rect(6, top + 8 + bodyLift, 2, 1, "#8d9b88");
    } else {
      d.rect(-4, top + childScale + bodyLift, 10, 11, "#ae765d");
      d.rect(-3, top + childScale + 1 + bodyLift, 10, 9, skin);
      d.rect(6, top + childScale + 5 + bodyLift, 2, 2, skin);
      d.rect(-5, top + childScale - 2 + bodyLift, 11, 5, hairShadow);
      d.rect(-6, top + childScale + 1 + bodyLift, 3, 8, hairMid);
      d.rect(4, top + childScale + 5 + bodyLift, 1, 1, "#15221f");
    }
  } else {
    // 村人は従来どおり少数色の共通素体。役割小物だけを後段で重ねる。
    const childWalkFrame = heroChild && motion?.mode === "walk" ? Math.abs(motion.frame) % 4 : 0;
    const childWalking = heroChild && motion?.mode === "walk";
    const childLift = childWalking && childWalkFrame % 2 === 1 ? -1 : 0;
    const childLegs = [
      { back: -6, front: 2 },
      { back: -5, front: 1 },
      { back: 1, front: -5 },
      { back: 0, front: -4 },
    ][childWalkFrame]!;
    if (childLift !== 0) ctx.translate(0, childLift);
    const workingHandY = keeper || hunter || merchant ? npcIdleFrame : 0;
    d.rect(childWalking ? childLegs.back : -6, -leg, 5, leg, pants);
    d.rect(childWalking ? childLegs.front : 2, -leg, 5, leg, pants);
    d.rect(-7, -2, 6, 2, "#1b2622");
    d.rect(2, -2, 6, 2, "#1b2622");
    d.rect(-8, -leg - torso, 16, torso, coat);
    d.rect(-7, -leg - torso + 2, 14, 2, trim);
    d.rect(-11, -leg - torso + 2, 4, adult ? 13 : 11, coat);
    d.rect(8, -leg - torso + 2 + workingHandY, 4, adult ? 13 : 11, coat);
    d.rect(-11, -leg - 3, 4, 4, skin);
    d.rect(8, -leg - 3 + workingHandY, 4, 4, skin);
    d.rect(-Math.floor(head / 2), -leg - torso - head + 1, head, head, skin);
    d.rect(-Math.floor(head / 2) - 1, -leg - torso - head - 2, head + 2, 4, hair);
    d.rect(-Math.floor(head / 2) - 1, -leg - torso - head + 1, 2, 5, hair);
    d.rect(2, -leg - torso - head + 5, 1, 1, "#19201d");
  }

  if (keeper) {
    // 共同倉の管理人。前掛け、銀髪の結び、腰の鍵だけで役割を読む。
    d.rect(-5, -27, 11, 14, "#879071");
    d.rect(-3, -25, 7 + npcIdleFrame, 2, "#adb18a");
    d.rect(-4, -15, 9, 2, "#596956");
    d.rect(-8, -43, 4, 5, "#d0c9b4");
    d.rect(-9, -42, 3, 3, "#979b8f");
    d.rect(7, -16 + npcIdleFrame, 2, 4, "#8e7445");
    d.rect(9, -14 + npcIdleFrame, 2, 2, PAL.accent);
  }

  if (villager) {
    // 一般村人は生活者の補修布だけ。専門職の大きな道具を持たせない。
    d.rect(-6, -43, 12, 3, "#8f744e");
    d.rect(-7, -41, 3, 5, "#6b523d");
    d.rect(-5, -22, 4, 5, "#a86e50");
    d.rect(-4, -21, 3, 1, "#d09a67");
  }

  if (hunter && !motion?.injured) {
    // フード、弓、矢筒。曲線の補間を使わず、段差のあるドットで弓形を作る。
    d.rect(-7, -44, 13, 4, "#1b2b25");
    d.rect(-8, -42, 4, 8, "#20352c");
    d.rect(-10, -32, 5, 18, "#294033");
    d.rect(-10, -28, 3, 17, "#4a3727");
    d.rect(-11, -31, 1, 7, PAL.accent);
    d.rect(-8, -32, 1, 7, "#c4a15f");
    const bowY = npcIdleFrame;
    d.rect(11, -31 + bowY, 2, 5, "#8d7046");
    d.rect(13, -28 + bowY, 2, 5, "#a58450");
    d.rect(15, -24 + bowY, 2, 10, "#a58450");
    d.rect(13, -15 + bowY, 2, 5, "#8d7046");
    d.rect(11, -11 + bowY, 2, 4, "#6e5338");
    d.rect(12, -28 + bowY, 1, 18, "#c1b08a");
  }

  if (merchant) {
    // 低い帽子、紫の襟、背負い箱。村人より横幅のある旅装にする。
    d.rect(-7, -45, 13, 3, "#684761");
    d.rect(-5, -43, 10, 2, "#8f627e");
    d.rect(-7, -34, 15, 4, "#744f6d");
    d.rect(2, -33, 6 + npcIdleFrame, 1, "#d0a765");
    d.rect(-14, -30, 6, 22, "#4b382b");
    d.frame(-14, -30, 6, 22, "#b18b58");
    d.rect(8, -25, 7, 14, "#816540");
    d.rect(10, -23, 3, 10, "#b69258");
    d.rect(-12, -25, 2, 12, "#d0a765");
  }

  if (carryingSack) {
    d.rect(9, -leg - 2, 14, 12, "#aa8d58");
    d.rect(12, -leg - 5, 8, 4, "#705d3c");
    d.rect(11, -leg, 10, 1, "#d2b477");
    if (adult) drawDoubleLoopKnot(d, 16, -leg - 6, 0.45, "#6c5b3e");
  }
  ctx.restore();

  if (sena || guardian || senaAdult) {
    // 左手と指輪は身体の左右反転へ含めず、各向きで明示的に置く。
    // 指輪は常時オーラにせず、錆びた金属1px＋青緑1pxだけに抑える。
    const mode = motion?.mode ?? "idle";
    const walkFrame = mode === "walk" ? Math.abs(motion?.frame ?? 0) % 4 : 0;
    const bodyLift = mode === "walk" && walkFrame % 2 === 1 ? -1 : 0;
    const ringSwingY = mode === "walk" ? [ -1, 0, 1, 0 ][walkFrame]! : 0;
    const ringReach = mode === "walk" ? [ 1, 0, -1, 0 ][walkFrame]! : 0;
    const handX = facing > 0
      ? Math.round(cx + 9 + ringReach)
      : Math.round(cx - 12 - ringReach);
    const ringLower = Math.round(Math.max(0, Math.min(1, motion?.ringHandLower ?? 0)) * (adult ? 3 : 2));
    const handY = Math.round(bottom - (adult ? 15 : 12) + bodyLift + ringSwingY + ringLower);
    d.rect(handX, handY, 4, 5, skin);
    d.rect(handX + (facing > 0 ? 2 : 0), handY + 2, 2, 1, "#8d7452");
    d.rect(handX + (facing > 0 ? 3 : 0), handY + 2, 1, 1, PAL.accentCool);
  }
}

/** 第一章の導入戦用仮素材。完成敵絵へ置換しても接地位置はこの規格を保つ。 */
export function drawBoundaryBeast(
  d: Display, cx: number, bottom: number, t: number, yielded = false,
): void {
  const bob = Math.sin(t * (yielded ? 1.1 : 2.1)) * (yielded ? 0.35 : 1.2);
  const y = bottom + bob;
  const ctx = d.ctx;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, bottom + 2, 27, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (yielded) {
    // 倒れた姿ではなく、前脚を折って枝角を道から外す姿。
    d.rect(cx - 33, y - 23, 11, 6, "#294337");
    d.rect(cx - 28, y - 28, 48, 21, "#294337");
    d.rect(cx - 24, y - 31, 38, 20, "#607c69");
    d.rect(cx - 18, y - 34, 24, 5, "#91a797");
    d.rect(cx - 9, y - 29, 8, 14, "#b9c4b2");
    d.rect(cx - 20, y - 11, 9, 11, "#263d30");
    d.rect(cx + 6, y - 9, 12, 6, "#263d30");
    // 首と額を下げ、枝角を右上ではなく地面と平行に伏せる。
    d.rect(cx + 8, y - 27, 20, 18, "#7f9587");
    d.rect(cx + 18, y - 20, 19, 12, "#b9c4b2");
    d.rect(cx + 32, y - 17, 7, 6, "#506a5c");
    d.rect(cx + 27, y - 31, 3, 13, "#d3d9c8");
    d.rect(cx + 20, y - 33, 10, 3, "#d3d9c8");
    d.rect(cx + 18, y - 37, 3, 7, "#d3d9c8");
    d.rect(cx + 34, y - 29, 3, 11, "#d3d9c8");
    d.rect(cx + 34, y - 31, 9, 3, "#d3d9c8");
    d.rect(cx + 33, y - 15, 2, 2, PAL.accentCool);
    return;
  }

  // 牙ではなく、白い樹皮と枝角、道を塞ぐ横長の姿勢を識別形にする。
  d.rect(cx - 32, y - 27, 10, 7, "#294337");
  d.rect(cx - 27, y - 31, 49, 25, "#294337");
  d.rect(cx - 23, y - 36, 39, 23, "#607c69");
  d.rect(cx - 18, y - 39, 25, 6, "#91a797");
  d.rect(cx - 9, y - 34, 8, 16, "#b9c4b2");
  d.rect(cx + 10, y - 39, 22, 25, "#7f9587");
  d.rect(cx + 16, y - 43, 14, 8, "#b9c4b2");
  d.rect(cx + 28, y - 31, 7, 8, "#506a5c");
  d.rect(cx - 21, y - 12, 8, 12, "#263d30");
  d.rect(cx + 10, y - 12, 8, 12, "#263d30");
  // 左右で高さを変えた枝角。矩形の段差だけで白樹らしさを出す。
  d.rect(cx + 14, y - 51, 3, 13, "#d3d9c8");
  d.rect(cx + 8, y - 53, 9, 3, "#d3d9c8");
  d.rect(cx + 7, y - 58, 3, 8, "#d3d9c8");
  d.rect(cx + 24, y - 49, 3, 11, "#d3d9c8");
  d.rect(cx + 24, y - 51, 8, 3, "#d3d9c8");
  d.rect(cx + 30, y - 55, 3, 7, "#d3d9c8");
  d.rect(cx + 25, y - 34, 3, 2, PAL.accentCool);
}

/** 十年後の村道。遠景・家並み・路面の三層を明確に分ける。 */
export function renderVillageRoad(d: Display, t: number, o: VillageRoadOptions = {}): void {
  const ctx = d.ctx;
  const theme = THEMES.village;

  if (isVillageRoadBackgroundReady(o.background)) {
    d.clear(theme.skyTop);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(o.background, 0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
    drawVillageRoadStoryState(d, o);
    return;
  }

  d.clear(theme.skyTop);
  ctx.save();

  const sky = ctx.createLinearGradient(0, 0, 0, 168);
  sky.addColorStop(0, "#386875");
  sky.addColorStop(0.56, theme.skyBottom);
  sky.addColorStop(1, "#c3c69b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, 168);

  // 遠景の畑と丘。
  ctx.fillStyle = "#66845e";
  ctx.beginPath();
  ctx.moveTo(0, 116);
  for (let x = 0; x <= SCREEN_W; x += 48) ctx.lineTo(x, 105 + ((x / 48) % 3) * 7);
  ctx.lineTo(SCREEN_W, 165);
  ctx.lineTo(0, 165);
  ctx.fill();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = PAL.accent;
  for (let x = 18; x < SCREEN_W; x += 31) ctx.fillRect(x, 127 + (x % 11), 7, 1);
  ctx.globalAlpha = 1;

  // 中景の家。屋根の傾斜と漆喰の明暗で、共同倉と素材感を変える。
  for (const house of [
    { x: 22, w: 108, h: 72, wall: "#8b805f" },
    { x: 324, w: 128, h: 82, wall: "#746e56" },
  ]) {
    const y = 164 - house.h;
    ctx.fillStyle = house.wall;
    ctx.fillRect(house.x, y, house.w, house.h);
    ctx.fillStyle = "#2d463b";
    ctx.beginPath();
    ctx.moveTo(house.x - 10, y + 5);
    ctx.lineTo(house.x + house.w / 2, y - 28);
    ctx.lineTo(house.x + house.w + 12, y + 5);
    ctx.closePath();
    ctx.fill();
    d.rect(house.x + 18, y + 26, 20, 25, "#9eb7a3");
    d.frame(house.x + 18, y + 26, 20, 25, "#536d5d");
    d.rect(house.x + house.w - 34, y + 34, 20, house.h - 34, "#493e30");
  }

  // 貧しくても捨てずに直した布と植木箱。生活色は小面積で反復する。
  for (const [x, y, color] of [
    [46, 99, "#c56f62"], [59, 101, "#d2b66a"], [72, 98, "#5f9b7d"],
    [359, 91, "#6fa7a0"], [372, 94, "#b87791"], [385, 90, "#d1b263"],
  ] as const) {
    d.rect(x, y, 11, 7, color);
    d.rect(x + 2, y + 1, 7, 1, "rgba(244,230,200,0.28)");
  }
  for (const x of [91, 315, 429]) {
    d.rect(x, 146, 24, 8, "#594832");
    d.rect(x + 3, 142, 3, 5, "#6f9a5c");
    d.rect(x + 11, 140, 3, 7, "#d0a955");
    d.rect(x + 18, 143, 3, 4, "#70a486");
  }

  // 共同井戸。
  d.rect(141, 126, 46, 36, "#59655a");
  d.frame(141, 126, 46, 36, "#99a18a");
  d.rect(137, 123, 54, 6, "#3e4c43");
  d.rect(148, 104, 4, 22, "#5b4630");
  d.rect(176, 104, 4, 22, "#5b4630");
  d.rect(148, 104, 32, 3, "#856d45");

  // 前景の道。足元Y=176へ光を集め、人物の接地を読みやすくする。
  ctx.fillStyle = "#8f815c";
  ctx.fillRect(0, 162, SCREEN_W, SCREEN_H - 162);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#d1bd7b";
  for (let x = -20; x < SCREEN_W; x += 43) {
    const wobble = Math.sin(t * 0.16 + x) * 2;
    ctx.fillRect(x, 177 + wobble, 25, 2);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
  drawVillageRoadStoryState(d, o);
}

/** 村道の固定景観へ重ねる物語状態。候補背景の比較でも本編と同じ座標を使う。 */
export function drawVillageRoadStoryState(d: Display, o: VillageRoadOptions = {}): void {
  const ctx = d.ctx;
  ctx.save();
  if (o.merchantArrived) {
    // 行商人の到着を人物だけに背負わせず、村の外から来た荷量で読ませる。
    d.rect(398, 157, 66, 5, "#4a3a2e");
    d.rect(405, 139, 52, 19, "#715438");
    d.rect(408, 142, 46, 2, "#b18b58");
    d.frame(405, 139, 52, 19, "#3f3027");
    d.rect(414, 129, 24, 11, "#604831");
    d.frame(414, 129, 24, 11, "#b18b58");
    d.rect(440, 133, 12, 7, "#684761");
    d.rect(442, 131, 8, 2, "#a77993");
    d.rect(382, 159, 20, 2, "#5e4832");
    for (const wheelX of [412, 451]) {
      d.rect(wheelX - 5, 160, 11, 11, "#2b2923");
      d.rect(wheelX - 3, 162, 7, 7, "#806746");
      d.rect(wheelX, 164, 2, 2, "#2b2923");
    }
    // 火災の日付を知った後だけ、荷台の記録紙が開かれたまま残る。
    if (o.fireDateKnown) {
      d.rect(414, 125, 26, 10, "#c8bb91");
      d.frame(414, 125, 26, 10, "#675b49");
      d.rect(418, 128, 12, 1, "#6c604c");
      d.rect(418, 131, 8, 1, "#6c604c");
      d.rect(434, 130, 3, 3, "#74506f");
    }
  }

  const shade = ctx.createLinearGradient(0, 176, 0, SCREEN_H);
  shade.addColorStop(0, "rgba(23,52,45,0)");
  shade.addColorStop(1, "rgba(7,20,17,0.52)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 176, SCREEN_W, SCREEN_H - 176);
  ctx.restore();
}

/** 村門。村道の欧州農村と白い木の森を、同じ水平路面で接続する。 */
export function renderVillageGate(d: Display, t: number, o: VillageGateOptions = {}): void {
  if (isVillageGateBackgroundReady(o.background)) {
    d.clear(THEMES.village.skyTop);
    const ctx = d.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(o.background, 0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
    if (o.disturbed) drawVillageGateDisturbance(d);
    drawVillageGateStoryState(d, o);
    return;
  }

  renderForestBoundary(d, t, { disturbed: o.disturbed });
  const ctx = d.ctx;
  ctx.save();
  // 村側の柵と門柱。
  ctx.fillStyle = "#544a34";
  ctx.fillRect(0, 116, 232, 8);
  for (let x = 10; x < 244; x += 30) {
    ctx.fillRect(x, 99, 7, 64);
    ctx.fillStyle = "#8e7b50";
    ctx.fillRect(x + 1, 100, 2, 55);
    ctx.fillStyle = "#544a34";
  }
  d.rect(232, 68, 15, 105, "#453e2e");
  d.rect(270, 68, 15, 105, "#453e2e");
  d.rect(227, 63, 63, 11, "#756342");
  d.frame(227, 63, 63, 11, "#b0965f");
  d.text("北の森", 238, 64, "#d8c994", 9);

  ctx.restore();
  drawVillageGateStoryState(d, o);
}

/** 正式PNGへ焼き込まない、森の活発化を示す足跡と掻き跡。 */
function drawVillageGateDisturbance(d: Display): void {
  const ctx = d.ctx;
  ctx.save();
  ctx.globalAlpha = 0.48;
  for (const [x, y] of [[118, 170], [146, 166], [176, 162], [207, 158], [238, 154]] as const) {
    d.rect(x, y, 4, 2, "#34483a");
    d.rect(x + 6, y + 4, 4, 2, "#34483a");
    d.rect(x + 3, y, 2, 1, "#21352b");
    d.rect(x + 9, y + 4, 2, 1, "#21352b");
  }
  d.rect(258, 158, 18, 1, "#566348");
  d.rect(264, 162, 13, 1, "#485640");
  ctx.restore();
}

/** 村門の固定景観へ重ねる物語状態。候補背景の比較でも本編と同じ座標を使う。 */
export function drawVillageGateStoryState(d: Display, o: VillageGateOptions = {}): void {
  const ctx = d.ctx;
  ctx.save();
  // 狩人隊の装備。人数を背景NPCで増やさず、空いた道具から不在を示す。
  d.rect(294, 145, 14, 17, "#4b382b");
  d.frame(294, 145, 14, 17, "#9c7b4d");
  if (o.hunterDeparted) {
    // 狩人頭の出発後は矢と革袋がなくなり、空いた箱だけが残る。
    d.rect(296, 148, 10, 3, "#2f3026");
    d.rect(295, 160, 12, 2, "#765c3c");
  } else {
    d.rect(298, 139, 6, 7, "#6f593b");
    d.rect(302, 117, 2, 27, "#a58450");
    d.rect(305, 121, 2, 23, "#c1b08a");
  }

  if (o.warningKnown) {
    // 村の警告布。鮮色はこの一か所だけに置く。
    d.rect(274, 83, 2, 22, "#5d4932");
    d.rect(276, 84, 14, 7, "#b85e55");
    d.rect(278, 86, 9, 1, "#df9a70");
  }

  if (o.borderOpen) {
    // 外した横木は消さず、門の村側へ立て掛ける。
    d.rect(207, 143, 29, 4, "#766142");
    d.rect(202, 150, 34, 4, "#594a35");
    d.rect(232, 142, 3, 13, "#b0965f");
  } else {
    // 会話上の通行止めを、実際の横木として見せる。
    d.rect(239, 112, 39, 5, "#766142");
    d.rect(239, 137, 39, 5, "#594a35");
    d.rect(243, 113, 2, 28, "#b0965f");
    d.rect(272, 113, 2, 28, "#b0965f");
    drawDoubleLoopKnot(d, 258, 127, 0.55, "#c1a66c");
  }
  ctx.restore();
}

export function drawSack(
  d: Display, cx: number, bottom: number, scale = 1, color = "#b99a61", doubleLoop = false,
): void {
  const ctx = d.ctx;
  const w = Math.round(18 * scale);
  const h = Math.round(16 * scale);
  const x = Math.round(cx - w / 2);
  const y = Math.round(bottom - h);
  d.rect(x + 2, y + 2, w, h, PAL.shadow);
  d.rect(x, y + 4, w, h - 4, color);
  d.rect(x + 3, y + 1, w - 6, 4, "#755f3d");
  d.rect(x + 3, y + 5, w - 6, 1, "#d1b273");
  ctx.save();
  ctx.globalAlpha = 0.35;
  d.rect(x + w - 3, y + 6, 2, h - 7, "#4b4030");
  ctx.restore();
  if (doubleLoop) drawDoubleLoopKnot(d, cx, y + 1, 0.45 * scale, "#6c5b3e");
}
