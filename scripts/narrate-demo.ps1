param([string]$OutputDirectory = 'artifacts/demo')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$outputPath = [IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
if (-not $outputPath.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Output must stay inside the project.' }
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Zira Desktop')
$speaker.Rate = 2
try {
    $scenes = Get-Content -Raw -Encoding UTF8 'docs/demo-scenes.json' | ConvertFrom-Json
    foreach ($scene in $scenes) {
        $audioPath = Join-Path $outputPath ($scene.id + '.wav')
        $speaker.SetOutputToWaveFile($audioPath)
        $speaker.Speak([string]$scene.text)
        $speaker.SetOutputToNull()
        Write-Host "Narrated scene $($scene.id): $($scene.title)"
    }
} finally { $speaker.Dispose() }
