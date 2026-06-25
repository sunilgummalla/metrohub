$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
git -C $repoRoot config core.hooksPath .githooks

Write-Host "Git hooks installed for $repoRoot"
Write-Host "Direct commits and pushes to protected branches are now blocked locally."
