param(
    [switch]$Launch
)

$ErrorActionPreference = "Stop"
$Global:allOk = $true

function Step-Title($title) {
    Write-Host "`n========================================" -ForegroundColor DarkGray
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor DarkGray
}

function Step-Result($ok, $msg) {
    if ($ok) {
        Write-Host "  [OK]  $msg" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL]  $msg" -ForegroundColor Red
        $Global:allOk = $false
    }
}

function Find-Python {
    $candidates = @(
        @{ cmd = "python"   ; arg = "--version" ; label = "python" },
        @{ cmd = "python3"  ; arg = "--version" ; label = "python3" },
        @{ cmd = "py"       ; arg = "-c `"import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')`"" ; label = "py" }
    )

    foreach ($c in $candidates) {
        try {
            $v = Invoke-Expression "& $($c.cmd) $($c.arg) 2>`$null"
            if (-not $v) { continue }
            $verString = if ($v -is [array]) { $v[0] } else { $v }
            $match = [regex]::Match($verString, "(\d+)\.(\d+)")
            if (-not $match.Success) { continue }
            $major = [int]$match.Groups[1].Value
            $minor = [int]$match.Groups[2].Value
            if ($major -eq 3 -and $minor -ge 12) {
                return @{ cmd = $c.cmd; version = "$major.$minor" }
            }
        } catch {
            continue
        }
    }
    return $null
}

function Check-Command($name, $cmd, $versionArg, $minVersion, $versionPattern) {
    try {
        $v = & $cmd $versionArg 2>$null
        if (-not $v) { Step-Result $false "$name introuvable" ; return $false }

        $verString = if ($v -is [array]) { $v[0] } else { $v }
        $match = [regex]::Match($verString, $versionPattern)
        if (-not $match.Success) { Step-Result $false "$name - version non detectee" ; return $false }

        $ver = [Version]$match.Groups[1].Value
        $minVer = [Version]$minVersion
        $ok = $ver -ge $minVer
        $label = if ($ok) { '(OK)' } else { "(minimum requis : $minVersion)" }
        Step-Result $ok "$name $ver $label"
        return $ok
    } catch {
        Step-Result $false "$name - $($_.Exception.Message)"
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       GhostScrape - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Step-Title "Verification des prerequis"

$pythonInfo = Find-Python
if ($pythonInfo) {
    $pythonCmd = $pythonInfo.cmd
    $majorMinor = $pythonInfo.version
    Step-Result $true "Python $majorMinor (commande : $pythonCmd)"
    if ($majorMinor -ge "3.14") {
        Write-Host "    [WARN]  Python $majorMinor est tres recent. Si l'installation echoue, utilisez Python 3.12 ou 3.13." -ForegroundColor Yellow
    }
} else {
    Step-Result $false "Python 3.12+ introuvable (essaye: python, python3, py)"
}

$nodeOk = Check-Command "Node.js" "node" "--version" "18.0.0" "v(\d+\.\d+\.\d+)"

if (-not $Global:allOk) {
    Write-Host "`nDes prerequis sont manquants. Installez-les puis relancez setup.ps1" -ForegroundColor Yellow
    Write-Host "    Python 3.12 : https://www.python.org/downloads/"
    Write-Host "    Node.js 18+ : https://nodejs.org/"
    exit 1
}

Step-Title "Installation du backend"

$venvPath = "backend\venv"
$pipPath = "$venvPath\Scripts\pip"

if (-not (Test-Path "$venvPath\Scripts\python.exe")) {
    Write-Host "  -> Creation du venv avec $pythonCmd..." -ForegroundColor Yellow
    if ($pythonCmd -eq "py") {
        & py -m venv --clear $venvPath
    } else {
        & $pythonCmd -m venv --clear $venvPath
    }
    if (-not $?) { Step-Result $false "Echec creation venv" ; exit 1 }
    Step-Result $true "Environnement virtuel cree"
} else {
    Step-Result $true "Environnement virtuel existant"
}

Write-Host "  -> Installation des dependances..." -ForegroundColor Yellow
try {
    $output = & $pipPath install -r backend\requirements.txt --quiet 2>&1
    if ($LASTEXITCODE -ne 0) { throw $output }
    Step-Result $true "Dependances backend installees"
} catch {
    Step-Result $false "Echec dependances backend : $_"
}

Step-Title "Installation du frontend"

if (Test-Path "frontend\node_modules") {
    Step-Result $true "node_modules existant"
} else {
    Write-Host "  -> npm install..." -ForegroundColor Yellow
    Push-Location frontend
    & npm install --silent
    $ok = $?
    Pop-Location
    Step-Result $ok "Dependances frontend installees"
}

Step-Title "Extension Chrome"

if (Test-Path "extension\manifest.json") {
    Step-Result $true "Extension trouvee dans extension/"
} else {
    Step-Result $false "extension/manifest.json introuvable"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           Resume du setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Global:allOk) {
    Write-Host "`n  Tout est pret !" -ForegroundColor Green
    Write-Host "`n  Prochaines etapes :" -ForegroundColor White
    Write-Host "  1. Lancez les serveurs :  .\start-dev.ps1" -ForegroundColor Yellow
    Write-Host "  2. Ouvrez Chrome -> chrome://extensions" -ForegroundColor Yellow
    Write-Host "  3. Activez le Mode developpeur" -ForegroundColor Yellow
    Write-Host "  4. Cliquez sur Charger l'extension non empaquetee" -ForegroundColor Yellow
    Write-Host "  5. Selectionnez le dossier : $(Resolve-Path extension)" -ForegroundColor Yellow
    Write-Host "  6. Ouvrez http://localhost:3000" -ForegroundColor Yellow

    if ($Launch) {
        Write-Host "`n  Lancement des serveurs..." -ForegroundColor Green
        & .\start-dev.ps1
    }
} else {
    Write-Host "`n  Certaines etapes ont echoue. Corrigez les erreurs et relancez." -ForegroundColor Red
    exit 1
}