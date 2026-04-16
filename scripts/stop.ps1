# stop.ps1 — Kills any processes holding app development ports
# Run via: bun run stop

$ports = @(9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009, 9010)
$killed = $false

foreach ($port in $ports) {
    # Use netstat to find LISTENING processes - reliable on all Windows versions
    $lines = netstat -ano | Select-String (":$port\s") | Select-String "LISTENING"
    foreach ($line in $lines) {
        $parts = ($line.ToString().Trim() -split '\s+')
        $procId = $parts[-1]
        if ($procId -match '^\d+$' -and [int]$procId -gt 0) {
            Write-Host "Killing PID $procId on port $port..."
            taskkill /F /PID $procId 2>&1 | Out-Null
            $killed = $true
        }
    }
}

if ($killed) {
    Write-Host "Done. All dev ports cleared."
} else {
    Write-Host "No processes found on dev ports. All clear."
}
