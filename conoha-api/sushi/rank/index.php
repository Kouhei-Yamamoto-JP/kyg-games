<?php
/**
 * GET/POST https://api.kyg-style.com/sushi/rank
 * 回転寿司ゲーム ランキング API（PDO + prepared statements / Composer 不要）
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = dirname(__DIR__, 2) . '/config.php';
if (!is_readable($configPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server configuration missing'], JSON_UNESCAPED_UNICODE);
    exit;
}
require $configPath;

$origin = defined('CORS_ORIGIN') ? CORS_ORIGIN : 'https://game.kyg-style.com';
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 86400');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * @return PDO
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

/**
 * @return list<array{name:string,score:int,level:int,served:int,date:string,durationSec:int}>
 */
function fetchTop20(PDO $pdo): array
{
    $sql = 'SELECT name, score, level, served, duration_sec, created_at
            FROM scores
            ORDER BY score DESC, duration_sec ASC, created_at ASC
            LIMIT 20';
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();
    $out = [];
    foreach ($rows as $row) {
        $created = (string) $row['created_at'];
        // DATETIME → ISO-ish with Z-less local server time; client accepts string dates
        $date = str_replace(' ', 'T', $created);
        $out[] = [
            'name' => (string) $row['name'],
            'score' => (int) $row['score'],
            'level' => (int) $row['level'],
            'served' => (int) $row['served'],
            'date' => $date,
            'durationSec' => (int) $row['duration_sec'],
        ];
    }
    return $out;
}

function jsonOk(array $entries): void
{
    echo json_encode(['ok' => true, 'entries' => $entries], JSON_UNESCAPED_UNICODE);
}

function jsonErr(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $pdo = db();
        jsonOk(fetchTop20($pdo));
        exit;
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '', true);
        if (!is_array($data)) {
            jsonErr('Invalid JSON body');
            exit;
        }

        $name = isset($data['name']) ? trim((string) $data['name']) : '';
        if ($name === '') {
            $name = 'ななし';
        }
        // マルチバイト対応で最大12文字
        if (function_exists('mb_substr')) {
            $name = mb_substr($name, 0, 12, 'UTF-8');
        } else {
            $name = substr($name, 0, 36);
        }
        if ($name === '') {
            $name = 'ななし';
        }

        $score = (int) ($data['score'] ?? 0);
        $level = (int) ($data['level'] ?? 1);
        $served = (int) ($data['served'] ?? 0);
        $durationSec = (int) ($data['durationSec'] ?? $data['duration_sec'] ?? 0);

        if ($score < 0) {
            $score = 0;
        }
        if ($level < 1) {
            $level = 1;
        }
        if ($served < 0) {
            $served = 0;
        }
        if ($durationSec < 0) {
            $durationSec = 0;
        }

        $pdo = db();
        $stmt = $pdo->prepare(
            'INSERT INTO scores (name, score, level, served, duration_sec, created_at)
             VALUES (:name, :score, :level, :served, :duration_sec, NOW())'
        );
        $stmt->execute([
            ':name' => $name,
            ':score' => $score,
            ':level' => $level,
            ':served' => $served,
            ':duration_sec' => $durationSec,
        ]);

        jsonOk(fetchTop20($pdo));
        exit;
    }

    jsonErr('Method not allowed', 405);
} catch (Throwable $e) {
    // 資格情報や詳細スタックをクライアントへ漏らさない
    error_log('sushi/rank error: ' . $e->getMessage());
    jsonErr('Internal server error', 500);
}
