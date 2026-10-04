# qol-mini uninstall, from a clone.
& (Join-Path $PSScriptRoot 'scripts/qol-mini.ps1') uninstall @args
exit $LASTEXITCODE
