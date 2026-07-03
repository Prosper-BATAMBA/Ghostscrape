param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Continue"
$rootDir = $PSScriptRoot

function Write-Banner {
    Clear-Host
    Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     GhostScrape — Développement       ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Cyan
}

function Test-Ready($name, $path, $label) {
    if (-not (Test-Path $path)) {
        Write-Host "  ❌  $name introuvable : $label" -ForegroundColor Red
        Write-Host "      Lancez d'abord .\setup.ps1" -ForegroundColor Yellow
        return $false
    }
    return $true
}

# ──────────────────────────────────────────────
# VÉRIFICATIONS AVANT LANCEMENT
# ──────────────────────────────────────────────
Write-Banner

Write-Host "`n🔍  Vérifications..." -ForegroundColor Cyan

$checks = @(
    @{ Name = "Backend venv"    ; Path = "$rootDir\backend\venv\Scripts\uvicorn.exe" ; Label = "backend\venv\Scripts\uvicorn.exe" },
    @{ Name = "Frontend"        ; Path = "$rootDir\frontend\node_modules\.package-lock.json" ; Label = "frontend\node_modules" },
    @{ Name = "Extension"       ; Path = "$rootDir\extension\manifest.json" ; Label = "extension\manifest.json" }
)

$allReady = $true
foreach ($c in $checks) {
    $ok = Test-Ready $c.Name $c.Path $c.Label
    if (-not $ok) { $allReady = $false }
}

if (-not $allReady) {
    pause
    exit 1
}

Write-Host "  ✅  Tout est prêt" -ForegroundColor Green

# ──────────────────────────────────────────────
# LANCEMENT DES SERVEURS
# ──────────────────────────────────────────────
Write-Banner

Write-Host "`n🚀  Démarrage des serveurs..." -ForegroundColor Cyan
Write-Host "    Backend  → http://localhost:8000" -ForegroundColor White
Write-Host "    Frontend → http://localhost:3000" -ForegroundColor White
Write-Host "    Dashboard → http://localhost:3000" -ForegroundColor White
Write-Host "`n    Appuyez sur Ctrl+C pour tout arrêter" -ForegroundColor DarkGray
Write-Host ""

# Backend
$backendJob = Start-Job -Name "ghostscrape-backend" -ScriptBlock {
    param($root)
    $venv = Join-Path $root "backend\venv\Scripts"
    $env:PATH = "$venv;$env:PATH"
    Set-Location (Join-Path $root "backend")
    uvicorn app.main:app --reload --port 8000 --log-level info
} -ArgumentList $rootDir

# Frontend
$frontendJob = Start-Job -Name "ghostscrape-frontend" -ScriptBlock {
    param($root)
    Set-Location (Join-Path $root "frontend")
    npm run dev
} -ArgumentList $rootDir

# Ouvrir le navigateur
if (-not $NoBrowser) {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
}

# Surveiller et afficher les logs
try {
    while ($backendJob.State -eq "Running" -and $frontendJob.State -eq "Running") {
        $backendLog = Receive-Job -Job $backendJob
        $frontendLog = Receive-Job -Job $frontendJob

        foreach ($line in $backendLog) {
            Write-Host "[Backend]  $line" -ForegroundColor DarkYellow
        }
        foreach ($line in $frontendLog) {
            Write-Host "[Frontend] $line" -ForegroundColor DarkCyan
        }

        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host "`n🛑  Arrêt des serveurs..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob
    Stop-Job -Job $frontendJob
    Remove-Job -Job $backendJob
    Remove-Job -Job $frontendJob
    Write-Host "  ✅  Arrêté." -ForegroundColor Green
}
