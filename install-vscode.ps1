# Wrapper for Windows PowerShell. The logic lives in install-vscode.py.
#
# A fresh Windows has python.exe already: the Microsoft Store alias, a stub that
# prints "Python was not found" and exits 9009. Get-Command sees it as a real
# command, so each candidate is run once before it is trusted. The probe runs
# with errors set to Continue: under Windows PowerShell 5.1, a native command
# writing to stderr is a terminating error when the preference is Stop.
$ErrorActionPreference = 'Stop'

function Test-Python($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { return $false }
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $name --version 2>&1 | Out-Null; return ($LASTEXITCODE -eq 0) }
    catch { return $false }
    finally { $ErrorActionPreference = $previous }
}

foreach ($candidate in @('python', 'python3', 'py')) {
    if (Test-Python $candidate) {
        & $candidate (Join-Path $PSScriptRoot 'install-vscode.py') @args
        exit $LASTEXITCODE
    }
}
Write-Error 'Python 3.8+ is required. Install it from https://www.python.org/downloads/ and check "Add python.exe to PATH".'
exit 1
