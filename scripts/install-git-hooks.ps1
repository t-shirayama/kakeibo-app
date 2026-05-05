Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
git -C $repoRoot config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) {
  throw "Failed to set core.hooksPath"
}
Write-Output "Git hooks path was set to .githooks"
