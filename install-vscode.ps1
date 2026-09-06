# Wrapper for Windows PowerShell. The logic lives in install-vscode.py.
$ErrorActionPreference = 'Stop'
foreach ($candidate in @('python', 'python3', 'py')) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        & $candidate (Join-Path $PSScriptRoot 'install-vscode.py') @args
        exit $LASTEXITCODE
    }
}
Write-Error 'python3 is required.'
exit 1
