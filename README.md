# 綴られた世界

物語と戦闘を中心にしたWeb RPGシリーズの制作リポジトリです。

## 作品

- `funsho-no-yoru/` — シリーズ1『焚書の夜』
- `series2/yohaku-no-mori/` — シリーズ2『余白の森』

各作品は独立したViteアプリです。

## ローカル起動

シリーズ1：

```powershell
cd funsho-no-yoru
npm install
npm run dev
```

シリーズ2：

```powershell
cd series2/yohaku-no-mori
npm install
npm run dev
```

ビルドは各作品のフォルダで `npm run build` を実行します。

## リポジトリ方針

このリポジトリをシリーズ全体の正本とします。各作品の履歴は保持したまま統合しており、Cloudflare Workersなどのデプロイでは対象作品のサブフォルダをルートに指定します。

