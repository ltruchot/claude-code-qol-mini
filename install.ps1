# qol-mini install, from a clone.
& (Join-Path $PSScriptRoot 'scripts/qol-mini.ps1') install @args
exit $LASTEXITCODE
