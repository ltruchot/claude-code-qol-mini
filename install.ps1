# Wrapper for Windows PowerShell. The logic lives in install.py.
$ErrorActionPreference = 'Stop'
foreach ($candidate in @('python', 'python3', 'py')) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        & $candidate (Join-Path $PSScriptRoot 'install.py') @args
        exit $LASTEXITCODE
    }
}
Write-Error 'python3 is required. Install it from https://www.python.org/downloads/'
exit 1
