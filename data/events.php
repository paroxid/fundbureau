<?php

ini_set('display_errors', '0');

// How long a saved copy is reused before the sheet is fetched again.
// Sheet edits show up on the site within this many seconds of the next visit.
const EVENTS_CACHE_TTL = 3600;

const EVENTS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1aIs1ri-NbTAMpy01xwomAhwV0BdIpbe5-8QPJCEiiaQ/export?format=csv';

const EVENTS_CACHE_FILE = __DIR__ . DIRECTORY_SEPARATOR . 'events.csv';

function events_cache_is_fresh($cacheFile)
{
    clearstatcache(true, $cacheFile);
    if (!is_file($cacheFile)) {
        return false;
    }
    return (time() - filemtime($cacheFile)) < EVENTS_CACHE_TTL;
}

function events_fetch_sheet($url)
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) {
            return false;
        }
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_USERAGENT => 'fundbureau-events-sync',
        ));
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false || $status < 200 || $status >= 300) {
            return false;
        }
        return $body;
    }

    if (!ini_get('allow_url_fopen')) {
        return false;
    }

    $context = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => 20,
            'follow_location' => 1,
            'max_redirects' => 5,
            'header' => "User-Agent: fundbureau-events-sync\r\n",
        ),
    ));
    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        return false;
    }
    return $body;
}

function events_normalize_csv($body)
{
    if (!is_string($body)) {
        return null;
    }
    if (strncmp($body, "\xEF\xBB\xBF", 3) === 0) {
        $body = substr($body, 3);
    }
    if (strlen($body) === 0 || strlen($body) > 2 * 1024 * 1024) {
        return null;
    }
    $trimmed = ltrim($body);
    if ($trimmed === '' || $trimmed[0] === '<') {
        return null;
    }
    if (!preg_match('/^\d{1,2}\.\d{1,2}\.\d{2},/m', $trimmed)) {
        return null;
    }
    return $body;
}

function events_write_cache($cacheFile, $csv)
{
    $tmp = $cacheFile . '.' . getmypid() . '.tmp';
    if (file_put_contents($tmp, $csv, LOCK_EX) === false) {
        @unlink($tmp);
        return false;
    }
    if (@rename($tmp, $cacheFile)) {
        return true;
    }
    // Windows cannot rename over a file that already exists.
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && is_file($cacheFile)) {
        @unlink($cacheFile);
        if (@rename($tmp, $cacheFile)) {
            return true;
        }
    }
    @unlink($tmp);
    return false;
}

function events_refresh_cache($cacheFile)
{
    $lock = @fopen($cacheFile . '.lock', 'c');
    if ($lock === false) {
        return;
    }
    if (!flock($lock, LOCK_EX)) {
        fclose($lock);
        return;
    }
    if (!events_cache_is_fresh($cacheFile)) {
        $csv = events_normalize_csv(events_fetch_sheet(EVENTS_SHEET_URL));
        if ($csv !== null) {
            events_write_cache($cacheFile, $csv);
        }
    }
    flock($lock, LOCK_UN);
    fclose($lock);
}

function events_serve($cacheFile)
{
    clearstatcache(true, $cacheFile);
    if (!is_file($cacheFile)) {
        http_response_code(502);
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: no-store');
        echo "events unavailable\n";
        return;
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    header('X-Events-Source: sheet-sync');
    readfile($cacheFile);
}

if (!events_cache_is_fresh(EVENTS_CACHE_FILE)) {
    events_refresh_cache(EVENTS_CACHE_FILE);
}
events_serve(EVENTS_CACHE_FILE);
