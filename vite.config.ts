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
});
