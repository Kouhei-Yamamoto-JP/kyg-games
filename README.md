# KYG Style Games

カスタムドメイン **[game.kyg-style.com](https://game.kyg-style.com/)** 向けの、ブラウザだけで遊べる小さなゲーム集（GitHub Pages）です。

## 公開 URL

| URL | 内容 |
|-----|------|
| https://game.kyg-style.com/ | ハブ（ゲーム一覧・日本語 UI） |
| https://game.kyg-style.com/sushi/ | 回転寿司ゲーム |

（DNS 反映前は `https://kouhei-yamamoto-jp.github.io/kyg-games/` でも同じ内容を確認できます。）

## リポジトリ構成

```
kyg-games/
├── CNAME                 # game.kyg-style.com（変更しない）
├── index.html            # ハブ一覧
├── style.css             # ハブ用スタイル
├── sushi/
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── README.md
└── README.md
```

今後のゲームは **兄弟フォルダ**（例: `◯◯/`）として追加します。

## 新しいゲームの追加手順

1. リポジトリ直下にフォルダを作る（例: `puzzle/`）
2. その中に `index.html`（必要なら `style.css` / `game.js`）を置く。パスはフォルダ内の相対パスで完結させる
3. ルートの `index.html` にカード（リンク）を 1 つ追加する
4. `main` に push → GitHub Pages が自動デプロイ

## カスタムドメイン（ConoHa DNS）

- **GitHub Pages カスタムドメイン**: `game.kyg-style.com`（ルート `CNAME` ファイルの内容と一致）
- **ConoHa DNS**: `game` の **CNAME** → `kouhei-yamamoto-jp.github.io`

DNS 側はリポジトリ外で管理します。このリポジトリでは `CNAME` の内容（`game.kyg-style.com`）を維持し、Pages 設定は外さないでください。

tools.kyg-style.com と同じパターンです（Host `tools` → 同上ターゲット）。

## ローカル確認

```bash
npx serve .
# → http://localhost:3000/
# → http://localhost:3000/sushi/
```

`package.json` は不要です。静的ファイルのみで完結します。
