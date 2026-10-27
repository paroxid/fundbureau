<?php
header('Content-Type: text/html; charset=utf-8');

$extensions = ['mp4', 'webm', 'ogg', 'mov'];
$names = [];

foreach (scandir(__DIR__) as $name) {
    if ($name === '.' || $name === '..') {
        continue;
    }
    $path = __DIR__ . DIRECTORY_SEPARATOR . $name;
    if (!is_file($path)) {
        continue;
    }
    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($extension, $extensions, true)) {
        continue;
    }
    $names[] = $name;
}

sort($names, SORT_STRING);

echo "<ul>\n";
foreach ($names as $name) {
    $href = htmlspecialchars(rawurlencode($name), ENT_QUOTES, 'UTF-8');
    echo '<li><a href="' . $href . '">' . $href . "</a></li>\n";
}
echo "</ul>\n";
