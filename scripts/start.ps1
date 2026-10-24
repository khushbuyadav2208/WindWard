param([switch]$Install)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
if ($Install) {
    if (-not (Test-Path '.venv/Scripts/python.exe')) { py -3.12 -m venv .venv }
    & '.venv/Scripts/python.exe' -m pip install -r backend/requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
    npm --prefix frontend ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
}
npm --prefix frontend run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend production build failed.' }
Write-Host 'Windward is available at http://127.0.0.1:8000'
& '.venv/Scripts/python.exe' -m uvicorn index:app --host 127.0.0.1 --port 8000
