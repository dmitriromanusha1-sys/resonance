# build.ps1 — сборка RESONANCE в dist/
# Конкатенирует + минифицирует JS и CSS, копирует ассеты и HTML
# Запуск: .\build.ps1

$src  = "$PSScriptRoot\resonance"
$dist = "$PSScriptRoot\dist"

# ── Очистка и создание dist ──────────────────────────────────────────────
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory $dist | Out-Null
New-Item -ItemType Directory "$dist\assets" | Out-Null
New-Item -ItemType Directory "$dist\video"  | Out-Null

Write-Host "[1/5] Каталоги созданы" -ForegroundColor Cyan

# ── Порядок JS-файлов (строго по index.html) ────────────────────────────
$jsFiles = @(
  'js\rng.js'
  'js\polyfills.js'
  'js\assets.js'
  'js\shared.js'
  'js\config.js'
  'js\classes.js'
  'js\levels.js'
  'js\campaign.js'
  'js\weather.js'
  'js\tutorial.js'
  'js\anomalies.js'
  'js\room3d.js'
  'js\skills.js'
  'js\sfx.js'
  'js\settings.js'
  'js\game.js'
  'js\controls.js'
  'js\endless.js'
  'js\main.js'
)

# ── Порядок CSS-файлов ───────────────────────────────────────────────────
$cssFiles = @(
  'css\base.css'
  'css\npc.css'
  'css\skilltree.css'
  'css\ability.css'
  'css\settings.css'
  'css\room3d.css'
  'css\mobile.css'
)

# ── Функция: базовая минификация ─────────────────────────────────────────
function Minify-JS($text) {
  # Убираем однострочные комментарии (не трогаем URL в строках)
  # Простая замена: строки начинающиеся с // после пробелов
  $lines = $text -split "`n"
  $out = [System.Collections.Generic.List[string]]::new()
  $inBlock = $false
  foreach ($line in $lines) {
    # Убираем блочные комментарии /* ... */ (однострочные)
    if (!$inBlock) {
      # начало блочного комментария
      if ($line -match '/\*' -and $line -notmatch '\*/') {
        $inBlock = $true
        # отрезаем до /*
        $before = ($line -split '/\*')[0].Trim()
        if ($before) { $out.Add($before) }
        continue
      }
      # блочный комментарий на одной строке /* ... */
      $line = [regex]::Replace($line, '/\*.*?\*/', '')
      # однострочный комментарий // (вне строк — грубо)
      if ($line -match '^\s*//') { continue }
      $trimmed = $line.Trim()
      if ($trimmed) { $out.Add($trimmed) }
    } else {
      if ($line -match '\*/') {
        $inBlock = $false
        $after = ($line -split '\*/')[1].Trim()
        if ($after) { $out.Add($after) }
      }
      # внутри блочного комментария — пропускаем
    }
  }
  # Склеиваем строки
  $joined = $out -join ' '
  # Сжимаем лишние пробелы
  $joined = [regex]::Replace($joined, '\s{2,}', ' ')
  return $joined
}

function Minify-CSS($text) {
  # Убираем комментарии /* ... */
  $text = [regex]::Replace($text, '/\*[\s\S]*?\*/', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Убираем переносы и лишние пробелы
  $text = [regex]::Replace($text, '\s{2,}', ' ')
  $text = [regex]::Replace($text, '\s*([:;,{}])\s*', '$1')
  $text = [regex]::Replace($text, ';}', '}')
  $text = $text.Trim()
  return $text
}

# ── Сборка JS ────────────────────────────────────────────────────────────
Write-Host "[2/5] Сборка JS..." -ForegroundColor Cyan
$jsParts = [System.Collections.Generic.List[string]]::new()
foreach ($f in $jsFiles) {
  $path = "$src\$f"
  if (!(Test-Path $path)) { Write-Warning "  Не найден: $f"; continue }
  $raw  = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $mini = Minify-JS $raw
  $jsParts.Add($mini)
  Write-Host "  + $f" -ForegroundColor DarkGray
}
$jsBundle = $jsParts -join "`n"
[System.IO.File]::WriteAllText("$dist\app.js", $jsBundle, [System.Text.Encoding]::UTF8)
$jsOrig = ($jsFiles | ForEach-Object { (Get-Item "$src\$_").Length } | Measure-Object -Sum).Sum
$jsDist = (Get-Item "$dist\app.js").Length
Write-Host "  JS: $([math]::Round($jsOrig/1KB,1)) KB → $([math]::Round($jsDist/1KB,1)) KB" -ForegroundColor Green

# ── Сборка CSS ───────────────────────────────────────────────────────────
Write-Host "[3/5] Сборка CSS..." -ForegroundColor Cyan
$cssParts = [System.Collections.Generic.List[string]]::new()
foreach ($f in $cssFiles) {
  $path = "$src\$f"
  if (!(Test-Path $path)) { Write-Warning "  Не найден: $f"; continue }
  $raw  = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $mini = Minify-CSS $raw
  $cssParts.Add($mini)
  Write-Host "  + $f" -ForegroundColor DarkGray
}
$cssBundle = $cssParts -join "`n"
[System.IO.File]::WriteAllText("$dist\app.css", $cssBundle, [System.Text.Encoding]::UTF8)
$cssOrig = ($cssFiles | ForEach-Object { (Get-Item "$src\$_").Length } | Measure-Object -Sum).Sum
$cssDist = (Get-Item "$dist\app.css").Length
Write-Host "  CSS: $([math]::Round($cssOrig/1KB,1)) KB → $([math]::Round($cssDist/1KB,1)) KB" -ForegroundColor Green

# ── Копирование ассетов ──────────────────────────────────────────────────
Write-Host "[4/5] Копирование ассетов..." -ForegroundColor Cyan
Copy-Item "$src\assets\*" "$dist\assets\" -Recurse -Force
Copy-Item "$src\video\*"  "$dist\video\"  -Recurse -Force
$assetCount = (Get-ChildItem "$dist\assets" -File).Count
Write-Host "  Скопировано: $assetCount файлов" -ForegroundColor Green

# ── Генерация index.html ─────────────────────────────────────────────────
Write-Host "[5/5] Генерация index.html..." -ForegroundColor Cyan
$html = [System.IO.File]::ReadAllText("$src\index.html", [System.Text.Encoding]::UTF8)

# Заменяем все <link rel="stylesheet"...> на один тег app.css
$html = [regex]::Replace($html,
  '(<link\s+rel="stylesheet"[^>]+>\s*\n?)+',
  '<link rel="stylesheet" href="app.css?v=BUILD_VER">' + "`n",
  [System.Text.RegularExpressions.RegexOptions]::Singleline)

# Заменяем все <script src="js/..."> на один тег app.js
$html = [regex]::Replace($html,
  '(<script\s+src="js/[^"]+"></script>\s*\n?)+',
  '<script src="app.js?v=BUILD_VER"></script>' + "`n",
  [System.Text.RegularExpressions.RegexOptions]::Singleline)

# Подставляем версию (timestamp)
$ver = (Get-Date -Format 'yyyyMMddHHmm')
$html = $html.Replace('BUILD_VER', $ver)

[System.IO.File]::WriteAllText("$dist\index.html", $html, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "══════════════════════════════════════" -ForegroundColor Yellow
Write-Host " СБОРКА ЗАВЕРШЕНА → dist\" -ForegroundColor Yellow
$totalOrig = $jsOrig + $cssOrig
$totalDist = $jsDist + $cssDist
$saved = [math]::Round(($totalOrig - $totalDist) / $totalOrig * 100, 1)
Write-Host " JS+CSS: $([math]::Round($totalOrig/1KB,1)) KB → $([math]::Round($totalDist/1KB,1)) KB  (-$saved%)" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════" -ForegroundColor Yellow
