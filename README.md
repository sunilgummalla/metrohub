# Money Money

This is a multi-technology repository organized by platform:

- `js/`: JavaScript and TypeScript projects managed with pnpm.
  - `js/apps/api/`: NestJS API services.
  - `js/apps/experience/`: Next.js experience layer.
  - `js/apps/ui/`: React portal shell that hosts micro apps.
  - `js/packages/`: independently packaged micro apps and shared TypeScript libraries.
- `flutter/`: Flutter and Dart projects managed with Melos.
- `py/`: Python projects managed with uv.
- `docs/`: specifications, planning notes, and to-do items.
- `devops/`: build, deployment, and CI/CD materials.
- `scratch/`: temporary local files ignored by Git.

## Repository Rule

Do not commit or push directly to `develop`. Create a branch for every change and open a pull request into `develop`.

Install the versioned Git hooks after cloning:

```powershell
./devops/scripts/install-git-hooks.ps1
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.
