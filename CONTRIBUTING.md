# Contributing

Thanks for your interest in improving the Azure DevOps Team Member Randomizer extension! This guide covers the
development environment, coding conventions, build & packaging flow, and how to publish dev/prod versions.

---

## Getting Started

### Prerequisites

- Node.js 22. Older versions may work but are not tested.
- An Azure DevOps Publisher ID (Marketplace publisher). If you don't have one yet, create a publisher at: <https://marketplace.visualstudio.com/manage>
- Personal Access Token (PAT) or Alternate Token with Marketplace publish rights. Exposed here as `AZURE_DEVOPS_TOKEN`.
- Git installed.

### Fork, Clone & Install

Fork the repo <https://github.com/microsoft/azdo-extension-team-randomizer>

```shell
git clone https://github.com/<Your-GitHub-Username>/azdo-extension-team-randomizer.git
cd azdo-extension-team-randomizer
npm install
```

### Folder Overview (simplified)

```text
src/                 Source (React + Azure DevOps UI)
scripts/tfx.mjs      Build/publish wrapper around tfx-cli
azure-devops-extension*.json  Base + environment override manifests
dist/                Build output (generated)
out/                 VSIX output (via tfx create/publish)
```

## Environment Configuration

The build & publish scripts use environment-specific override manifests:

- `azure-devops-extension.dev.json` - local development ID, name & baseUri.
- `azure-devops-extension.prod.json` - production overrides (publisher, version, visibility).

The wrapper script `scripts/tfx.mjs` reads:

- `AZURE_DEVOPS_PUBLISHER` - required for dev mode create (if manifest does not embed a publisher).
- `AZURE_DEVOPS_TOKEN` - required for publish actions (PAT with Marketplace rights).
- `AZURE_DEVOPS_BASE_URI` - (optional) overrides the dev `baseUri` at packaging time (defaults to `https://localhost:33000`). Injected via an inline `--override {"baseUri": "..."}` argument and takes precedence over the dev override manifest.

### Dev Environment File

Create a file named `dev.env` in the repository root:

```shell
AZURE_DEVOPS_PUBLISHER=your-publisher-id
# Optional: if you prefer not to store PAT here, export AZURE_DEVOPS_TOKEN manually when publishing.
# AZURE_DEVOPS_TOKEN=your-marketplace-pat
```

### Prod Environment File

Create `prod.env` (used for production publish):

```shell
AZURE_DEVOPS_PUBLISHER=your-publisher-id
AZURE_DEVOPS_TOKEN=your-marketplace-pat
```

> NOTE: If any `publisher` field is filled directly in the manifest JSON files you can omit `AZURE_DEVOPS_PUBLISHER`, but keeping it in env keeps overrides explicit and portable.

## Development Workflow

### Format & Lint

```shell
npm run format
```

This invokes syncpack to normalize dependency spec formatting and runs Prettier over supported source files.

### Clean

```shell
npm run clean          # Removes dist/ and any VSIX artifacts
npm run clean:modules  # Deletes node_modules then reinstalls
```

### Compile (Without Packaging)

```shell
npm run compile:dev    # Development mode build (cleans first)
npm run compile:prod   # Production mode build (cleans first)
```

### Local Dev Server

```shell
npm run start:dev      # Webpack dev server on local baseUri defined in dev manifest
```

The dev server uses the `azure-devops-extension.dev.json` `baseUri` to serve content. You can load the extension in an Azure DevOps organization by uploading the generated VSIX or using the local host panel if configured.

## Packaging & Publishing

### Create VSIX (Dev)

```shell
npm run build:dev      # Cleans, compiles, runs tfx create with dev overrides
```

Result: VSIX is placed under `out/` (configured by tfx script). Use this for local installation/testing.

### Create VSIX (Prod)

```shell
npm run build:prod
```

Result: Production VSIX (with prod version overrides) in `out/`.

### Publish (Dev Channel)

```shell
npm run publish:dev    # Requires AZURE_DEVOPS_PUBLISHER and AZURE_DEVOPS_TOKEN (token only if manifest publisher omitted)
```

This uses `tfx extension publish` with the dev override manifest. Typically keep dev unlisted.

### Publish (Prod)

```shell
npm run publish:prod   # Requires AZURE_DEVOPS_TOKEN and publisher
```

Publishes the production variant. Ensure version bump before publishing (the script adds `--rev-version`).

> If you encounter `tfx-cli not found` errors, verify `node_modules/.bin` is on PATH or reinstall dev dependencies.

## Versioning Strategy

The base manifest (`azure-devops-extension.json`) carries a placeholder development version. The `tfx` wrapper adds `--rev-version` automatically, incrementing the patch revision. For controlled versioning:

1. Manually set version in `azure-devops-extension.prod.json` before running `npm run publish:prod`.
1. Commit the manifest change in the PR implementing a release.

## Branching & Pull Requests

- Use feature branches (`feat/...`, `fix/...`, `refactor/...`).
- Keep PRs focused; avoid mixing refactor + feature + dependency update in one PR unless atomic.
- Provide a concise PR description: motivation, key changes, testing notes.
- Link related issues (if issue tracking is added later).

### PR Checklist

- [ ] Build succeeds: `npm run compile:dev`
- [ ] Formatting applied: `npm run format`
- [ ] No stray console errors beyond intentional logging
- [ ] Manifest changes reviewed (publisher, version, visibility)
- [ ] Sensitive values not committed (no tokens in env files)

## Coding Conventions

- React: Functional components & hooks. Shared logic extracted to `src/shared/` (e.g., identity, sorting, selection).
- Sorting: Use `sortByDisplayName` / `createMemberComparator` (in `shared/sort.ts`) instead of ad-hoc localeCompare chains.
- Messages: Centralize user-visible strings in `shared/constants.ts`.
- Avoid duplication: Prefer adding utilities to shared modules before copying logic.
- Logging: Use the `logger` wrapper (`src/logger.ts`) for consistent namespacing and potential future log routing.

## Troubleshooting

| Issue                                   | Fix                                                                                           |
|-----------------------------------------|-----------------------------------------------------------------------------------------------|
| `Missing AZURE_DEVOPS_PUBLISHER`        | Add to `dev.env` / `prod.env` or fill `publisher` in manifest override.                       |
| `Missing AZURE_DEVOPS_TOKEN` on publish | Export a PAT: `set AZURE_DEVOPS_TOKEN=...` (Win) / `export AZURE_DEVOPS_TOKEN=...` (Unix).    |
| `tfx-cli not found`                     | Ensure `npx tfx` works or reinstall dev deps (`npm install`).                                 |
| VSIX empty / missing assets             | Confirm `dist/` exists and manifests reference `dist` folder in `files` section.              |
| Local UI doesn't load                   | Check `baseUri` (dev manifest or `AZURE_DEVOPS_BASE_URI`) matches dev server port (default 33000). |
| Wrong host/port in packaged dev build   | Verify override variable (`AZURE_DEVOPS_BASE_URI`) wasn't set unexpectedly in your shell. |

## Security & Token Handling

- Never commit PATs or secrets. Keep them in untracked `dev.env` / `prod.env` or shell session variables.
- Review scopes in manifest `scopes` array before expanding; request only what's necessary.

## Support & Further Questions

Use GitHub Issues for bugs & feature requests (enable issues if currently disabled). For private publisher-related questions, consult Azure DevOps Marketplace docs: <https://learn.microsoft.com/azure/devops/extend/publish/overview>

## Contribution Acceptance

All contributions are subject to code review and must comply with repository license (MIT) and Microsoft CLA where
applicable.

Thanks again for contributing! 🚀
