import type { ImageMap } from "../core/imageLoader.ts";
import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { sfx } from "../core/sfx.ts";
import { drawStoryPortrait, isStoryPortraitId } from "../fx/storyArt.ts";
import { windowBox } from "./hud.ts";

export type Speaker = {
  name: string;
  color: string;
  talks: string[][];
  found?: Record<string, string[]>;
  grants?: { talk: number; id: number; word: string }[];
  riddle?: { id: number; mask: string };
  portrait?: string;
  chapters?: number[];
  sprite?: string;
  battleAfter?: string;
  leadsTo?: {
    map: string;
    x: number;
    y: number;
    facing?: "up" | "down" | "left" | "right";
  };
  onEnter?: boolean;
  reward?: { id: number; word: string; lines: string[] };
};

let playerName = "";

export function setDialogueName(name: string): void {
  playerName = name;
}

export function fillName(line: string): string {
  return playerName ? line.split("{NAME}").join(playerName) : line;
}

const LINES_PER_PAGE = 3;
const PORTRAIT = 64;
const TYPE_SPEED = 42;

/** 作品共通の会話窓。物語データは一切保持しない。 */
export class DialogueBox {
  active = false;
  private pages: string[][] = [];
  private page = 0;
  private revealed = 0;
  private name = "";
  private color: string = PAL.ink;
  private caret = 0;
  private portrait: string | undefined;

  open(sp: Speaker, talk: string[]): void {
    const lines = talk.map(fillName);
    this.pages = [];
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
      this.pages.push(lines.slice(i, i + LINES_PER_PAGE));
    }
    this.page = 0;
    this.revealed = 0;
    this.name = sp.name;
    this.color = sp.color;
    this.portrait = sp.portrait;
    this.active = this.pages.length > 0;
  }

  private get pageLength(): number {
    return (this.pages[this.page] ?? []).reduce((n, line) => n + line.length, 0);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.caret += dt;
    this.revealed = Math.min(this.pageLength, this.revealed + dt * TYPE_SPEED);
  }

  /** @returns 会話が終わったら true */
  advance(): boolean {
    if (!this.active) return true;
    if (this.revealed < this.pageLength) {
      this.revealed = this.pageLength;
      sfx.play("move");
      return false;
    }
    sfx.play("page");
    this.page++;
    this.revealed = 0;
    if (this.page >= this.pages.length) {
      this.active = false;
      return true;
    }
    return false;
  }

  render(d: Display, images?: ImageMap): void {
    if (!this.active) return;
    const x = 16, y = 182, w = SCREEN_W - 32, h = 76;
    windowBox(d, x, y, w, h);

    const face = this.portrait ? images?.[`portrait.${this.portrait}`] : undefined;
    const codePortrait = isStoryPortraitId(this.portrait) ? this.portrait : undefined;
    const hasPortrait = face !== undefined || codePortrait !== undefined;
    const textX = hasPortrait ? x + PORTRAIT + 18 : x + 14;
    if (hasPortrait) {
      const fx = x + 7, fy = y + 6;
      d.rect(fx, fy, PORTRAIT, PORTRAIT, PAL.bg);
      if (face) d.spriteFoot(face, fx + PORTRAIT / 2, fy + PORTRAIT);
      else if (codePortrait) drawStoryPortrait(d, fx, fy, codePortrait);
      d.frame(fx, fy, PORTRAIT, PORTRAIT, PAL.line);
    }

    if (this.name) {
      const nw = Math.ceil(d.measure(this.name)) + 12;
      d.rect(x + 10, y - 7, nw, 15, PAL.panel);
      d.frame(x + 10, y - 7, nw, 15, PAL.line);
      d.rect(x + 10, y - 7, 2, 15, this.color);
      d.rect(x + 13, y - 6, Math.min(24, nw - 16), 1, this.color);
      d.text(this.name, x + 16, y - 5, this.color);
    }

    // 長い会話でも現在位置が分かる、小さな頁の節。文字より目立たせない。
    const dots = Math.min(8, this.pages.length);
    const dotX = x + w - 12 - dots * 7;
    for (let i = 0; i < dots; i++) {
      d.rect(dotX + i * 7, y + 7, i === this.page ? 5 : 3, 2, i === this.page ? PAL.accent : PAL.line);
    }

    let budget = Math.floor(this.revealed);
    const lines = this.pages[this.page] ?? [];
    lines.forEach((line, i) => {
      const shown = line.slice(0, Math.max(0, budget));
      budget -= line.length;
      const narration = this.portrait !== undefined && !line.startsWith("「");
      d.textRich(
        shown, textX, y + 12 + i * 16,
        narration ? PAL.dim : PAL.ink, PAL.accent, 12, line,
      );
    });

    if (this.revealed >= this.pageLength && Math.floor(this.caret * 3) % 2 === 0) {
      d.text("▼", x + w - 18, y + h - 18, PAL.accent);
    }
  }
}
