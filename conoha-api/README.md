# 回転寿司ランキング API（ConoHa WING）

GitHub Pages のクライアント（`https://game.kyg-style.com/sushi/`）向けのランキング API です。  
公開 URL: `https://api.kyg-style.com/sushi/rank`

## 前提

| 項目 | 値 |
|------|-----|
| Docroot | `~/public_html/api.kyg-style.com` |
| DB | `zbrk8_sushi_rank` |
| User | `zbrk8_66j56n53` |
| Host | `mysql75.conoha.ne.jp` |
| CORS Origin | `https://game.kyg-style.com` |

**パスワードは Git に含めません。** サーバー上の `config.php` でのみ設定してください。

## アップロード手順

1. この `conoha-api/` 配下を ConoHa の docroot にアップロードします。
   - 例: `config.sample.php` → `~/public_html/api.kyg-style.com/config.sample.php`
   - 例: `sushi/rank/index.php` → `~/public_html/api.kyg-style.com/sushi/rank/index.php`
   - `schema.sql` / `README.md` はサーバーに置かなくても動作します（手元用）。
2. サーバー上でサンプルをコピーして設定ファイルを作成します。

```bash
cd ~/public_html/api.kyg-style.com
cp config.sample.php config.php
# エディタで DB_PASS を実パスワードに変更（chmod 600 推奨）
chmod 600 config.php
```

3. phpMyAdmin（または mysql クライアント）で DB `zbrk8_sushi_rank` を選び、`schema.sql` の内容を実行して `scores` テーブルを作成します。
4. 動作確認（下記 curl）。

## エンドポイント

### GET `/sushi/rank`

トップ 20 件（`score` 降順 → `duration_sec` 昇順）。

```json
{
  "ok": true,
  "entries": [
    {
      "name": "ななし",
      "score": 1200,
      "level": 3,
      "served": 15,
      "date": "2026-09-21T12:00:00",
      "durationSec": 90
    }
  ]
}
```

### POST `/sushi/rank`

JSON ボディでスコア登録。成功時は更新後のトップ 20 を返します。

```json
{
  "name": "太郎",
  "score": 800,
  "level": 2,
  "served": 10,
  "durationSec": 60
}
```

- `name` は最大 12 文字（空なら「ななし」）
- エラー時: `{ "ok": false, "error": "..." }`（資格情報は含めません）

## curl テスト例

```bash
# GET
curl -sS -H 'Origin: https://game.kyg-style.com' \
  https://api.kyg-style.com/sushi/rank | jq .

# OPTIONS（CORS プリフライト）
curl -sS -D - -o /dev/null -X OPTIONS \
  -H 'Origin: https://game.kyg-style.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  https://api.kyg-style.com/sushi/rank

# POST
curl -sS -X POST https://api.kyg-style.com/sushi/rank \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://game.kyg-style.com' \
  -d '{"name":"テスト","score":100,"level":1,"served":2,"durationSec":45}' | jq .
```

## 注意

- `config.php` を公開ディレクトリに置く場合でも、中身が Web 経由で読めないよう PHP として実行されること・パーミッションを確認してください。
- クライアントは API 失敗時に `localStorage`（キー `kyg-sushi-ranking-v1`）へフォールバックします。
