import type { Display } from "./display.ts";

export interface Scene {
  /** @param keys このフレームに押されたキー名 */
  update(dt: number, keys: string[]): void;
  render(d: Display): void;
}
