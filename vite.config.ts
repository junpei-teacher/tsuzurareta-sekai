import { defineConfig } from "vite";

/**
 * 開発サーバーの設定。
 *
 * ポートは環境変数 `PORT` で差し替えられるようにしてある。
 * Vite は既定で 5173 に固定するが、**このゲームはポートを固定する理由がない。**
 * OAuth のコールバックも Webhook も使わず、外から叩かれることもない。
 * 5173 が別のプロセスに掴まれているだけで起動できなくなるほうが困る。
 */
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    /**
     * **トップレベル await を通すため。**
     *
     * `src/main.ts` は絵を読み終えてからループを回す（`await loadImages()`）。
     * これは意図した作りだが、Vite の既定の変換先（chrome87 など）では
     * トップレベル await が使えず、`npm run build` が通らなかった。
     * 開発サーバーはネイティブESMを配るので気づけず、**公開の直前まで隠れる**。
     *
     * 本作はキーボード必須のPC向けで（設計書 9）、対象は現行のブラウザだけでよい。
     */
    target: "esnext",
  },
});
