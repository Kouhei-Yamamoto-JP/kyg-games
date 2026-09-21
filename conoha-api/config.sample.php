<?php
/**
 * ConoHa WING MySQL 接続設定サンプル
 * サーバー上でこのファイルを config.php にコピーし、実パスワードを設定してください。
 * config.php は Git にコミットしないでください。
 */
declare(strict_types=1);

define('DB_HOST', 'mysql75.conoha.ne.jp');
define('DB_NAME', 'zbrk8_sushi_rank');
define('DB_USER', 'zbrk8_66j56n53');
define('DB_PASS', 'CHANGE_ME'); // ← サーバー上の config.php でのみ実パスワードを設定
define('CORS_ORIGIN', 'https://game.kyg-style.com');
