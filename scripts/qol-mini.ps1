# Run the CLI from a clone: build the bundles, then hand over to Node. The
# published package needs none of this: `pnpm dlx qol-mini <command>`.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$cli = Join-Path $root 'packages/qol-mini/dist/cli.js'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error 'Node.js 22.18+ is required: https://nodejs.org'
    exit 1
}
if (Get-Command vp -ErrorAction SilentlyContinue) {
    # A native command writing to stderr is terminating under Stop in 5.1
    $ErrorActionPreference = 'Continue'
    if (-not (Test-Path (Join-Path $root 'node_modules'))) {
        Push-Location $root; vp install --frozen-lockfile | Out-Null; Pop-Location
    }
    Push-Location (Join-Path $root 'packages/qol-mini'); vp pack | Out-Null; Pop-Location
} elseif (-not (Test-Path $cli)) {
    Write-Error "Not built, and Vite+ (vp) is not installed. Without a clone: pnpm dlx qol-mini $args"
    exit 1
}
& node $cli @args
exit $LASTEXITCODE
