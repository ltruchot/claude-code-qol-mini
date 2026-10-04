# qol-mini skills install, from a clone.
& (Join-Path $PSScriptRoot 'scripts/qol-mini.ps1') skills install @args
exit $LASTEXITCODE
