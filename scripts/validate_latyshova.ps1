$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$inv = Get-Content -Raw -Encoding UTF8 (Join-Path $root "latyshova\inventory.json") | ConvertFrom-Json
$ll  = Get-Content -Raw -Encoding UTF8 (Join-Path $root "latyshova\learning_layer.json") | ConvertFrom-Json

$unitIds = @{}
foreach ($u in $inv.units) { $unitIds[$u.id] = $u }
$nodeIds = @{}
foreach ($n in $ll.nodes) { $nodeIds[$n.id] = $n }

$unmapped = @($inv.units | Where-Object { -not $nodeIds.ContainsKey($_.node_id) -and $_.node_id -notlike 'LAT-META-*' })
$brokenClaims = 0
$brokenEdges = 0
$totalClaims = 0
$minClaims = 999

foreach ($n in $ll.nodes) {
    if ($n.claims.Count -lt $minClaims) { $minClaims = $n.claims.Count }
    foreach ($c in $n.claims) {
        $totalClaims++
        if (-not $unitIds.ContainsKey($c.unit_id) -or [string]::IsNullOrWhiteSpace($c.quote)) {
            $brokenClaims++
        }
    }
    foreach ($e in ($n.prerequisites + $n.related)) {
        if (-not $nodeIds.ContainsKey($e)) { $brokenEdges++ }
    }
}

$fmtStats = (@($ll.nodes | Group-Object format | ForEach-Object { "$($_.Name)=$($_.Count)" })) -join ", "
"VALIDATED: units=$($inv.total_units), nodes=$($ll.node_count), total_claims=$totalClaims, min_claims_per_node=$minClaims, unmapped=$($unmapped.Count), broken_claims=$brokenClaims, broken_edges=$brokenEdges"
"FORMATS: $fmtStats"
if ($unmapped.Count -gt 0 -or $brokenClaims -gt 0 -or $brokenEdges -gt 0) {
    exit 1
}
