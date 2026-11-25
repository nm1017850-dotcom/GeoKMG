# Deterministic inventory, coverage, and OCR audit builder for train_latyshova.md
# Generates:
#   latyshova/inventory.json
#   latyshova/coverage.md
#   latyshova/ocr_audit.md

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$inputPath = Join-Path $root "train_latyshova.md"
$outDir = Join-Path $root "latyshova"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$lines = [System.IO.File]::ReadAllLines($inputPath, [System.Text.Encoding]::UTF8)

function Get-NodeMapping([int]$lineNum) {
    if ($lineNum -le 21)   { return @("LAT-META-FRONT", "Введение / Титул", "Титул, выходные данные и предисловие") }
    if ($lineNum -le 189)  { return @("LAT-N01", "Глава I", "§ 1.1 Сопротивление пластовых вод и промывочных жидкостей") }
    if ($lineNum -le 491)  { return @("LAT-N02", "Глава I", "§ 1.2 Сопротивление водоносных пород и параметр пористости") }
    if ($lineNum -le 586)  { return @("LAT-N03", "Глава I", "§ 1.3 Сопротивление нефтегазоносных пород и параметр насыщения") }
    if ($lineNum -le 666)  { return @("LAT-N04", "Глава I", "§ 2 Характеристика объектов исследования в скважинах") }
    if ($lineNum -le 845)  { return @("LAT-N05", "Глава I", "§ 3 Кажущееся удельное сопротивление и геометрические факторы") }
    if ($lineNum -le 1159) { return @("LAT-N06", "Глава I", "§ 4 Определение границ пластов по диаграммам КС и микрозондов") }
    if ($lineNum -le 1795) { return @("LAT-N07", "Глава I", "§ 5 Боковое электрическое зондирование (БЭЗ)") }
    if ($lineNum -le 2266) { return @("LAT-N08", "Глава I", "§ 6 Определение сопротивления по разноглубинным фокусированным зондам") }
    if ($lineNum -le 2453) { return @("LAT-N09", "Глава I", "§ 7 Метод диэлектрической проницаемости (ДМ / ВДМ)") }
    if ($lineNum -le 2790) { return @("LAT-N10", "Глава II", "§ 8 Статическая амплитуда СП (диффузионно-адсорбционная и фильтрационная)") }
    if ($lineNum -le 2816) { return @("LAT-N11", "Глава II", "§ 9 Теоретические кривые СП") }
    if ($lineNum -le 3070) { return @("LAT-N12", "Глава II", "§ 10 Качественная и количественная интерпретация диаграмм СП") }
    if ($lineNum -le 3160) { return @("LAT-N13", "Глава III", "§ 11 Предварительная обработка диаграмм радиометрии") }
    if ($lineNum -le 3392) { return @("LAT-N14", "Глава III", "§ 12 Метод естественного гамма-излучения (ГМ)") }
    if ($lineNum -le 3527) { return @("LAT-N15", "Глава III", "§ 13 Метод рассеянного гамма-излучения (ГГМ-П)") }
    if ($lineNum -le 3915) { return @("LAT-N16", "Глава III", "§ 14 Нейтронные методы (НГМ, ННМ-Т)") }
    if ($lineNum -le 4270) { return @("LAT-N17", "Глава IV", "§ 15.1 Акустический метод (СПАК, уравнение среднего времени)") }
    if ($lineNum -le 4408) { return @("LAT-N18", "Глава IV", "§ 15.2 Широкополосный акустический метод (АКш)") }
    if ($lineNum -le 4469) { return @("LAT-N19", "Глава IV", "§ 16 Метод ядерно-магнитного резонанса (ЯМР / ССП)") }
    if ($lineNum -le 4530) { return @("LAT-N20", "Глава V", "§ 17–18 Условия вскрытия разрезов, типы разрезов и комплекс ГИС") }
    if ($lineNum -le 4607) { return @("LAT-N21", "Глава V", "§ 19 Составление литологического разреза по комплексу ГИС") }
    if ($lineNum -le 5054) { return @("LAT-N22", "Глава V", "§ 20.1 Межзерновые терригенные коллекторы") }
    if ($lineNum -le 5202) { return @("LAT-N23", "Глава V", "§ 20.2 Межзерновые карбонатные коллекторы") }
    if ($lineNum -le 5438) { return @("LAT-N24", "Глава V", "§ 21 Выделение и оценка сложных коллекторов") }
    if ($lineNum -le 5717) { return @("LAT-N25", "Глава V", "§ 22 Определение коэффициентов пористости и глинистости") }
    if ($lineNum -le 5867) { return @("LAT-N26", "Глава V", "§ 23 Определение коэффициента нефтегазонасыщения") }
    if ($lineNum -le 6064) { return @("LAT-N27", "Глава V", "§ 24 Статистическая оценка достоверности определения k_нг") }
    if ($lineNum -le 6176) { return @("LAT-N28", "Глава V", "§ 25 Определение коэффициента проницаемости") }
    if ($lineNum -le 6425) { return @("LAT-N29", "Глава VI", "Интерпретация результатов газометрии скважин") }
    return @("LAT-META-BACK", "Справочный аппарат", "Список литературы и предметный указатель")
}

function Get-OcrFlags([string]$text, [string]$kind) {
    $flags = [System.Collections.Generic.List[string]]::new()
    if ($text -match '\[нрзб') { $flags.Add("has_nrzb") }
    # Check severe garbled Cyrillic (Latin words >= 4 chars mixed into Russian or full Latin-garbled task/step)
    $noLatex = $text -replace '\\[A-Za-z]+', '' -replace '\$\$.*?\$\$', '' -replace '\\\(.*?\\\)', ''
    if ($kind -ne "figure_ocr" -and $noLatex -match '\b(?:OueHHTb|OIIpeJIeJIHTb|YcTaHaBnBaIOT|IocpoHTb|IpoBecTHn|OchoBbAcb|Ha\s+npo3paHbI|HcTHHHoe|IpaByIO|JIeByIO|3aIIINcIbAIOB|B\s+TeppHReHHOM)\b') {
        $flags.Add("ocr_garbled_cyrillic")
    }
    if ($kind -eq "figure_ocr" -and $text -match 'Депth|near\s+0|Range') {
        $flags.Add("mixed_latin_cyrillic")
    }
    if ($text -match '\\rho_\{?\\mathrm\{пп\}|\}\{?\\rho_\{?\\mathrm\{пп\}|\b\d+\+\d+\s*(?:%|Ом|м|мВ)|k_\{?[nm]\}|P_\{?n\}') {
        $flags.Add("formula_or_subscript_ocr_suspect")
    }
    return ,$flags.ToArray()
}

$units = [System.Collections.Generic.List[object]]::new()
$seq = 0
$page = 0
$inTaskSection = $false
$i = 0

function Add-Unit([int]$p, [int]$ls, [int]$le, [string]$kind, [string]$label, [string]$txt) {
    $script:seq++
    $map = Get-NodeMapping $ls
    $nodeId = $map[0]
    $chap = $map[1]
    $sec = $map[2]
    $flags = Get-OcrFlags $txt $kind
    $status = "covered_in_node"
    if ($nodeId -like "LAT-META-*") {
        $status = "reference_only"
    } elseif ($flags -contains "ocr_garbled_cyrillic") {
        $status = "needs_ocr_fix"
    } elseif ($flags.Count -gt 0 -or $kind -in @("formula", "table", "figure", "figure_ocr")) {
        $status = "covered_needs_scan_check"
    }
    $uid = ("LAT-P{0:D3}-U{1:D4}" -f $p, $script:seq)
    $preview = $txt.Trim()
    if ($preview.Length -gt 240) { $preview = $preview.Substring(0, 240) + "..." }
    $script:units.Add([PSCustomObject]@{
        id         = $uid
        page       = $p
        line_start = $ls
        line_end   = $le
        kind       = $kind
        label      = $label
        chapter    = $chap
        section    = $sec
        node_id    = $nodeId
        status     = $status
        ocr_flags  = $flags
        quote      = $preview
    })
}

while ($i -lt $lines.Count) {
    $lineNum = $i + 1
    $raw = $lines[$i]
    $trim = $raw.Trim()

    if ($trim -eq '') { $i++; continue }
    if ($trim -match '^<!-- page (\d+) -->$') {
        $page = [int]$Matches[1]
        $i++
        continue
    }

    # 1. FORMAT diagram description block (starts at ---- followed by ━━━ FORMAT or directly at ━━━ FORMAT)
    $isFormatStart = $false
    if ($trim -match '^----\s*$' -and ($i + 1) -lt $lines.Count -and $lines[$i + 1].Trim() -match '^━━━\s*FORMAT') {
        $isFormatStart = $true
    } elseif ($trim -match '^━━━\s*FORMAT') {
        $isFormatStart = $true
    }
    if ($isFormatStart) {
        $startLine = $lineNum
        $startPage = $page
        $buf = [System.Collections.Generic.List[string]]::new()
        $fmtTitle = ""
        if ($trim -match '^----\s*$') { $i++ }
        while ($i -lt $lines.Count) {
            $cur = $lines[$i].Trim()
            if ($cur -match '^<!-- page (\d+) -->$') { $page = [int]$Matches[1]; $i++; continue }
            if ($cur -match '^━━━\s*(FORMAT[^━\r\n]+)') {
                if ($fmtTitle -eq "") { $fmtTitle = $Matches[1].Trim() }
            }
            if ($cur -match '^----\s*$' -and $buf.Count -gt 0) {
                $i++
                break
            }
            if ($cur -match '^Рис\.?\s*\d+' -or $cur -match '^#{1,4}\s' -or $cur -match '^Пример\s+\d+') {
                # Missing closing ---- (e.g. before Рис. 87)
                break
            }
            $buf.Add($lines[$i])
            if ($cur -match '^KEYWORDS:' -and ($i + 1) -lt $lines.Count -and $lines[$i + 1].Trim() -notmatch '^----\s*$') {
                # Check if next non-empty line is another section or figure
                $j = $i + 1
                while ($j -lt $lines.Count -and $lines[$j].Trim() -eq '') { $j++ }
                if ($j -lt $lines.Count -and $lines[$j].Trim() -notmatch '^----\s*$') {
                    $i++
                    break
                }
            }
            $i++
        }
        $endLine = $i
        Add-Unit $startPage $startLine $endLine "figure_ocr" $fmtTitle ($buf -join "`n")
        continue
    }

    if ($trim -match '^----\s*$') { $i++; continue }

    # 2. Display math block \[ ... \] or $$ ... $$
    if ($trim -match '^\$\$.*\$\$' -or $trim -match '^\\\[.*\\\]') {
        Add-Unit $page $lineNum $lineNum "formula" "Формула" $trim
        $i++
        continue
    }
    if ($trim -match '^\\\[$' -or $trim -match '^\$\$') {
        $startLine = $lineNum
        $startPage = $page
        $buf = [System.Collections.Generic.List[string]]::new()
        $buf.Add($raw)
        $endToken = if ($trim -eq '\[') { '^\\\]' } else { '\$\$' }
        $i++
        while ($i -lt $lines.Count) {
            $cur = $lines[$i].Trim()
            if ($cur -match '^<!-- page (\d+) -->$') { $page = [int]$Matches[1]; $i++; continue }
            $buf.Add($lines[$i])
            if ($cur -match $endToken) { $i++; break }
            $i++
        }
        Add-Unit $startPage $startLine $i "formula" "Формула" ($buf -join " ")
        continue
    }

    # 3. Markdown Table block
    if ($trim -match '^\|') {
        $startLine = $lineNum
        $startPage = $page
        $buf = [System.Collections.Generic.List[string]]::new()
        while ($i -lt $lines.Count) {
            $cur = $lines[$i].Trim()
            if ($cur -match '^<!-- page (\d+) -->$') { $page = [int]$Matches[1]; $i++; continue }
            if ($cur -match '^\|') {
                $buf.Add($lines[$i])
                $i++
            } else { break }
        }
        Add-Unit $startPage $startLine $i "table" "Таблица (данные)" ($buf -join "`n")
        continue
    }

    # 4. Headings & Task section tracking
    if ($trim -match '^#{1,4}\s*Задач' -or $trim -match '^Задач[аи]¹?$') {
        $inTaskSection = $true
        Add-Unit $page $lineNum $lineNum "heading" "Задачи" $trim
        $i++
        continue
    }
    if ($trim -match '^(?:#+\s*)?(Рис\.?\s*\d+.*)') {
        $lbl = if ($trim -match 'Рис\.?\s*(\d+)') { "Рис. $($Matches[1])" } else { "Рисунок" }
        Add-Unit $page $lineNum $lineNum "figure" $lbl $trim
        $i++
        continue
    }
    if ($trim -match '^(?:#+\s*)?(Таблица\s+\d+.*|Продолжение таблицы\s+\d+.*)') {
        $lbl = if ($trim -match 'таблиц[аы]\s+(\d+)|Таблица\s+(\d+)') { "Таблица $($Matches[1])$($Matches[2])" } else { "Таблица" }
        Add-Unit $page $lineNum $lineNum "table_caption" $lbl $trim
        $i++
        continue
    }
    if ($trim -match '^#{1,4}\s+(.+)' -or $trim -match '^Глава\s+[IVX]+') {
        $inTaskSection = $false
        $lbl = $trim -replace '^#+\s*', ''
        if ($lbl.Length -gt 70) { $lbl = $lbl.Substring(0, 70) + "..." }
        Add-Unit $page $lineNum $lineNum "heading" $lbl $trim
        $i++
        continue
    }

    # 5. Examples
    if ($trim -match '^Пример\s+(\d+)') {
        $inTaskSection = $false
        $lbl = "Пример $($Matches[1])"
        Add-Unit $page $lineNum $lineNum "example" $lbl $trim
        $i++
        continue
    }

    # 6. Author tasks (numbered inside Задачи or explicit "Задача N." or un-dotted 82/83)
    if (($inTaskSection -and $trim -match '^(\d+)[\.\s]+\S') -or $trim -match '^Задача\s+(\d+)[\.\s]+\S') {
        $tnum = [int]$Matches[1]
        # Handle double-numbered biblio like "1. 1. ..."
        if ($lineNum -ge 6426) {
            Add-Unit $page $lineNum $lineNum "back_matter" "Литература" $trim
        } else {
            $lbl = "Задача $tnum"
            if ($lineNum -eq 842) { $lbl = "Задача 34 (OCR: 32)" }
            Add-Unit $page $lineNum $lineNum "task" $lbl $trim
        }
        $i++
        continue
    }

    # 7. Footnotes
    if ($trim -match '^(\$\^\{?\d+\}?\$|¹|²|³|\d+\s+[А-ЯA-Z])' -and $trim -match '^(\$\^\{?\d+\}?\$|¹|²|³)') {
        Add-Unit $page $lineNum $lineNum "footnote" "Сноска" $trim
        $i++
        continue
    }

    # 8. Front/Back matter or normal paragraph
    $mapNow = Get-NodeMapping $lineNum
    if ($mapNow[0] -eq "LAT-META-FRONT") {
        Add-Unit $page $lineNum $lineNum "front_matter" "Вводная часть" $trim
    } elseif ($mapNow[0] -eq "LAT-META-BACK") {
        Add-Unit $page $lineNum $lineNum "back_matter" "Справочный аппарат" $trim
    } else {
        Add-Unit $page $lineNum $lineNum "paragraph" "Абзац" $trim
    }
    $i++
}

# Write inventory.json
$invJsonPath = Join-Path $outDir "inventory.json"
$invObj = [PSCustomObject]@{
    source_file = "train_latyshova.md"
    total_lines = $lines.Count
    total_pages = $page
    total_units = $units.Count
    generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    units = $units
}
$invJson = $invObj | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($invJsonPath, $invJson, [System.Text.Encoding]::UTF8)

# Generate coverage.md
$covPath = Join-Path $outDir "coverage.md"
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# Таблица покрытия: Латышова М. Г. (1991)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Источник: [train_latyshova.md](../train_latyshova.md) (134 страницы PDF, 6 523 строки).")
[void]$sb.AppendLine("")

$byStatus = $units | Group-Object status
$byKind = $units | Group-Object kind
[void]$sb.AppendLine("## Сводка по статусам единиц")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| Статус | Кол-во единиц | Доля | Описание |")
[void]$sb.AppendLine("| --- | ---: | ---: | --- |")
$statusDesc = @{
    "covered_in_node"           = "Текст/пример/задача привязаны к узлу учебного слоя"
    "covered_needs_scan_check"  = "Привязаны к узлу, но требуют сверки со сканом PDF (формула, таблица, рисунок или подозрительный OCR-индекс)"
    "needs_ocr_fix"             = "Привязаны к узлу, но содержат битый OCR-текст (подмена кириллицы латиницей) — требуется восстановление по скану"
    "reference_only"            = "Служебный/справочный аппарат (титул, предисловие, библиография, предметный указатель) — не входит в учебные шаги"
}
foreach ($g in $byStatus) {
    $pct = [math]::Round(100.0 * $g.Count / $units.Count, 1)
    $d = $statusDesc[$g.Name]
    [void]$sb.AppendLine("| ``$($g.Name)`` | $($g.Count) | $pct% | $d |")
}
[void]$sb.AppendLine("| **Всего** | **$($units.Count)** | **100%** | Полное покрытие всех структурных единиц файла |")
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Сводка по типам единиц")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| Тип единицы | Кол-во |")
[void]$sb.AppendLine("| --- | ---: |")
foreach ($g in ($byKind | Sort-Object Count -Descending)) {
    [void]$sb.AppendLine("| ``$($g.Name)`` | $($g.Count) |")
}
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Покрытие по узлам учебного слоя (полный диапазон 1–134 стр.)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| Узел | Глава / Раздел | Стр. | Единиц | Абз. | Формул | Табл. | Рис. / Опис. | Примеров | Задач | Треб. сверки скана / OCR |")
[void]$sb.AppendLine("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")

$nodeOrder = $units | Select-Object -ExpandProperty node_id -Unique
foreach ($nid in $nodeOrder) {
    $nu = @($units | Where-Object { $_.node_id -eq $nid })
    $first = $nu[0]
    $minP = ($nu | Measure-Object -Property page -Minimum).Minimum
    $maxP = ($nu | Measure-Object -Property page -Maximum).Maximum
    $cPara = @($nu | Where-Object { $_.kind -eq "paragraph" }).Count
    $cForm = @($nu | Where-Object { $_.kind -eq "formula" }).Count
    $cTab  = @($nu | Where-Object { $_.kind -in @("table", "table_caption") }).Count
    $cFig  = @($nu | Where-Object { $_.kind -in @("figure", "figure_ocr") }).Count
    $cEx   = @($nu | Where-Object { $_.kind -eq "example" }).Count
    $cTsk  = @($nu | Where-Object { $_.kind -eq "task" }).Count
    $cScan = @($nu | Where-Object { $_.status -in @("covered_needs_scan_check", "needs_ocr_fix") }).Count
    [void]$sb.AppendLine("| ``$nid`` | $($first.chapter): $($first.section) | $minP–$maxP | $($nu.Count) | $cPara | $cForm | $cTab | $cFig | $cEx | $cTsk | $cScan |")
}
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Обоснование для единиц вне учебных узлов")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("- ``LAT-META-FRONT`` (стр. 1–3, единиц: $(@($units | Where-Object {$_.node_id -eq 'LAT-META-FRONT'}).Count)): выходные данные издания 1991 г. и предисловие — используются для библиографической карточки книги в каталоге, не формируют отдельного учебного шага.")
[void]$sb.AppendLine("- ``LAT-META-BACK`` (стр. 131–134, единиц: $(@($units | Where-Object {$_.node_id -eq 'LAT-META-BACK'}).Count)): список литературы [1–13] и предметный указатель — справочный аппарат для перекрёстных ссылок на палетки [1, 7, 8, 11, 12] и глоссария.")

[System.IO.File]::WriteAllText($covPath, $sb.ToString(), [System.Text.Encoding]::UTF8)

# Generate ocr_audit.md
$auditPath = Join-Path $outDir "ocr_audit.md"
$ab = [System.Text.StringBuilder]::new()
[void]$ab.AppendLine("# Журнал сверки OCR и сканов: Латышова М. Г.")
[void]$ab.AppendLine("")
[void]$ab.AppendLine("> [!IMPORTANT]")
[void]$ab.AppendLine('> В рабочем каталоге отсутствуют оригинальные сканы PDF книги Латышовой, поэтому все единицы из `train_latyshova.md` имеют статус `ocr_markdown_unverified` до визуальной сверки со сканами.')
[void]$ab.AppendLine("")

$garbled = @($units | Where-Object { $_.ocr_flags -contains "ocr_garbled_cyrillic" })
$nrzbUnits = @($units | Where-Object { $_.ocr_flags -contains "has_nrzb" })
$suspectFormula = @($units | Where-Object { $_.ocr_flags -contains "formula_or_subscript_ocr_suspect" })
$mixedUnits = @($units | Where-Object { $_.ocr_flags -contains "mixed_latin_cyrillic" })

[void]$ab.AppendLine("## 1. Критические дефекты OCR (подмена кириллицы латиницей — $($garbled.Count) единиц)")
[void]$ab.AppendLine("")
[void]$ab.AppendLine("| ID | Стр. | Строки | Узел | Тип | Фрагмент |")
[void]$ab.AppendLine("| --- | ---: | --- | --- | --- | --- |")
foreach ($u in $garbled) {
    $q = ($u.quote -replace '\|', '\|' -replace "`r?`n", " ")
    if ($q.Length -gt 120) { $q = $q.Substring(0, 120) + "..." }
    [void]$ab.AppendLine("| ``$($u.id)`` | $($u.page) | L$($u.line_start)–L$($u.line_end) | ``$($u.node_id)`` | $($u.label) | $q |")
}
[void]$ab.AppendLine("")

[void]$ab.AppendLine("## 2. Известные структурные и типографские аномалии в OCR")
[void]$ab.AppendLine("")
[void]$ab.AppendLine("- **Стр. 5 (L54–L76)**: таблица 1 («Данные анализов вод...») не имеет заголовка `Таблица 1`, хотя на неё ссылаются § 1 и задачи 1, 8, 112–114.")
[void]$ab.AppendLine("- **Стр. 10 (L296–L298)**: подписи `Рис. 5` и `Рис. 4` идут в обратном порядке относительно текста.")
[void]$ab.AppendLine("- **Стр. 22 (L842)**: задача 34 распознана с номером `32.` (дублирует номер задачи 32 на L840).")
[void]$ab.AppendLine("- **Стр. 27 (L1026–L1068)**: отсутствует задача 37 (после задачи 36 на стр. 26 сразу идёт подраздел микрозондов и задачи 38–39).")
[void]$ab.AppendLine("- **Стр. 86 (L4221, L4223)**: задачи 82 и 83 распознаны без точки после номера (`82 Построить...`, `83 Определить...`).")
[void]$ab.AppendLine("- **Стр. 15–16, 84, 108–125**: систематическая подмена знака диапазона `÷` на `+` (напр., `70+93 %`, `1,4+2,0`) и путаница в индексах кириллицы/латиницы (`k_n` вместо `k_п`/`k_в`, `ρ_m` вместо `ρ_зп`, `ρ_пп/ρ_пп` в формуле 10 на L497 вместо `ρ_п/ρ_вп`).")
[void]$ab.AppendLine("")

[void]$ab.AppendLine("## 3. Неразборчивые подписи на рисунках и палетках (`[нрзб]` — $($nrzbUnits.Count) блоков)")
[void]$ab.AppendLine("")
[void]$ab.AppendLine("| ID | Стр. | Строки | Узел | Описание блока |")
[void]$ab.AppendLine("| --- | ---: | --- | --- | --- |")
foreach ($u in $nrzbUnits) {
    [void]$ab.AppendLine("| ``$($u.id)`` | $($u.page) | L$($u.line_start)–L$($u.line_end) | ``$($u.node_id)`` | $($u.label) |")
}
[void]$ab.AppendLine("")

[void]$ab.AppendLine("## 4. Единицы с подозрительными формулами/индексами/диапазонами ($($suspectFormula.Count) единиц — первые 60)")
[void]$ab.AppendLine("")
[void]$ab.AppendLine("| ID | Стр. | Узел | Тип | Фрагмент |")
[void]$ab.AppendLine("| --- | ---: | --- | --- | --- |")
foreach ($u in ($suspectFormula | Select-Object -First 60)) {
    $q = ($u.quote -replace '\|', '\|' -replace "`r?`n", " ")
    if ($q.Length -gt 100) { $q = $q.Substring(0, 100) + "..." }
    [void]$ab.AppendLine("| ``$($u.id)`` | $($u.page) | ``$($u.node_id)`` | $($u.label) | $q |")
}

[System.IO.File]::WriteAllText($auditPath, $ab.ToString(), [System.Text.Encoding]::UTF8)

"Generated inventory ($($units.Count) units), coverage.md, and ocr_audit.md in $outDir"
