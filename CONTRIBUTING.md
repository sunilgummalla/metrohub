# Contributing

## Required Workflow

All repository changes must follow this workflow:

1. Start from an up-to-date `develop` branch.
2. Create a new branch before changing files.
3. Commit only on that branch.
4. Open a pull request into `develop`.
5. Merge only after required checks and reviews pass.

Direct commits and direct pushes to `develop` are not allowed.

## Branch Names

Use short, descriptive branch names:

```text
codex/<scope>
feature/<scope>
fix/<scope>
docs/<scope>
chore/<scope>
```

Examples:

```text
codex/repo-structure-and-branch-rules
feature/budget-dashboard
fix/auth-token-refresh
```

## Local Enforcement

Install the repo hooks once per clone:

```powershell
./devops/scripts/install-git-hooks.ps1
```

The hooks block commits on protected branches and block pushes directly to `develop`, `main`, or `master`.

## GitHub Enforcement

Local hooks help developers catch mistakes early, but GitHub branch protection is the source of truth for everyone. The `develop` branch must have protection enabled with:

- Pull requests required before merging.
- At least one approving review required.
- Stale approvals dismissed when new commits are pushed.
- Conversation resolution required.
- Force pushes disabled.
- Branch deletion disabled.

The policy JSON and helper script live under `devops/`.
