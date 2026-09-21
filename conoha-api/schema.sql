-- 回転寿司ランキング用テーブル（DB: zbrk8_sushi_rank）
-- phpMyAdmin 等でこの SQL を実行してください。

CREATE TABLE IF NOT EXISTS scores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(12) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  served INT NOT NULL DEFAULT 0,
  duration_sec INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rank (score DESC, duration_sec ASC, created_at ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
