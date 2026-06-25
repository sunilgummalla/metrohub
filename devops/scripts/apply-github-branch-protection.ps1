param(
    [string]$Repository = "sunilgummalla/money-money",
    [string]$Branch = "develop"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI 'gh' is required to apply branch protection."
}

$policyPath = Join-Path $PSScriptRoot "..\policies\github-develop-branch-protection.json"
$resolvedPolicyPath = (Resolve-Path $policyPath).Path

gh auth status 1>$null
gh api --method PUT "/repos/$Repository/branches/$Branch/protection" --input $resolvedPolicyPath
