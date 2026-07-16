# Release Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale inherited `release.yml` with a release-please pipeline that tags one version for the whole repo, writes a changelog, and pushes versioned Docker images — plus a dev snapshot workflow.

**Architecture:** `release-please` maintains an open release PR on `main` that accumulates changelog entries from conventional commits. Merging that PR tags `v{version}`, cuts a GitHub Release, and triggers a publish job that pushes `herytz/walletko` and `herytz/finance-to-walletko` at that version. A separate workflow pushes unversioned `dev` images on every push to `dev`. Nothing deploys — the pipeline ends at the registry.

**Tech Stack:** GitHub Actions, `googleapis/release-please-action@v5`, Docker Buildx, pnpm 10 / Node 22, conventional commits (already enforced by commitlint).

**Spec:** `docs/superpowers/specs/2026-07-16-release-versioning-design.md`

## Global Constraints

- **One version for the whole repo.** Root `package.json` is the only versioned manifest. `apps/*` and `packages/email` stay unversioned and ride along.
- **Release only — never deploy.** No SSH, no compose, no healthcheck. The pipeline ends at a tagged image in the registry.
- **Root stays `private: true`.** release-please bumps and tags; it never publishes to npm.
- **Image names:** `herytz/walletko`, `herytz/finance-to-walletko`. The old `herytz/finance` name is gone.
- **Docker build context is the repo root** (`.`) for both images — the Dockerfiles `COPY . .` and use `pnpm --filter`.
- **Both Dockerfiles' final stage is named `runner`.** There is no `prod` stage; the old workflow's `target: prod` would fail outright.
- **Use `pnpm install --frozen-lockfile`** in all workflows. The old workflow used `--no-frozen-lockfile`, which defeats the lockfile in automation.
- **Node 22** in workflows, matching `node:22-alpine` in both Dockerfiles. The old workflow pinned Node 20.
- **No postgres service.** Both apps' tests provision their own database via `@testcontainers/postgresql` (verified: `apps/walletko/tests/integration/setup.ts`, `apps/finance-to-walletko/src/test-helpers.test.ts`).
- **Existing secrets, reused as-is:** `DOCKER_USER`, `DOCKER_TOKEN`. The SSH secrets are no longer referenced.

## Deviations from the spec

Two, both deliberate. Flag to the user if either is unwelcome.

1. **Config filenames.** The spec wrote `.release-please-config.json` (leading dot). This plan uses `release-please-config.json` — release-please's own default — so both file inputs can be omitted from the workflow entirely. The manifest keeps its conventional dot: `.release-please-manifest.json`.
2. **Starting version is `0.0.0`, not `0.1.0`.** The spec said "start at 0.1.0," meaning *the first release should be 0.1.0*. release-please's manifest records the **last released** version, and bumps from it. Seeding `0.1.0` would make the first release `0.2.0`. Seeding `0.0.0` — honest, since nothing has been released — makes the first release PR propose `0.1.0`, which is the spec's intent.

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `package.json` | Modify | Holds the repo's single version. release-please's bump target. |
| `release-please-config.json` | Create | How to version: release type, package name, changelog sections. |
| `.release-please-manifest.json` | Create | The last released version. release-please's state. |
| `.github/workflows/release.yml` | Rewrite | Release PR on `main`; publish versioned images when it merges. |
| `.github/workflows/snapshot.yml` | Create | Push `dev` images on every push to `dev`. |

---

### Task 1: Version source of truth and release-please config

**Files:**
- Modify: `package.json:1-4` (add `version` after `name`)
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the contract Task 2 depends on — release-please reads `release-please-config.json` and `.release-please-manifest.json` from the repo root, bumps `version` in `package.json`, writes `CHANGELOG.md`, and (for the root package at path `.`) exposes unprefixed action outputs `release_created`, `version`, `tag_name`.

- [ ] **Step 1: Add the version field to root `package.json`**

Add `"version": "0.0.0"` immediately after `"name": "walletko"`. The file begins:

```json
{
  "name": "walletko",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@10.6.1+sha512.40ee09af407fa9fbb5fbfb8e1cb40fbb74c0af0c3e10e9224d7b53c7658528615b2c92450e74cfad91e3a2dcafe3ce4050d80bda71d757756d2ce2b66213e9a3",
```

Leave every other field untouched.

- [ ] **Step 2: Create `release-please-config.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "node",
      "package-name": "walletko",
      "changelog-path": "CHANGELOG.md",
      "include-component-in-tag": false,
      "changelog-sections": [
        { "type": "feat", "section": "Features" },
        { "type": "fix", "section": "Bug Fixes" },
        { "type": "perf", "section": "Performance" },
        { "type": "revert", "section": "Reverts" },
        { "type": "refactor", "section": "Refactors" },
        { "type": "docs", "section": "Documentation", "hidden": true },
        { "type": "chore", "section": "Chores", "hidden": true },
        { "type": "test", "section": "Tests", "hidden": true },
        { "type": "ci", "section": "CI", "hidden": true },
        { "type": "build", "section": "Build", "hidden": true }
      ]
    }
  }
}
```

`include-component-in-tag: false` produces tags like `v1.4.0` rather than `walletko-v1.4.0` — correct for a single-version repo.

- [ ] **Step 3: Create `.release-please-manifest.json`**

```json
{
  ".": "0.0.0"
}
```

This says "nothing released yet." The first release PR will therefore propose `0.1.0`, bumped by the `feat:` commits already on `main`.

- [ ] **Step 4: Verify the JSON parses and the two versions agree**

Run:

```bash
node -e '
const pkg = require("./package.json");
const manifest = require("./.release-please-manifest.json");
const config = require("./release-please-config.json");
if (pkg.version !== manifest["."]) throw new Error(`version mismatch: package.json ${pkg.version} vs manifest ${manifest["."]}`);
if (!config.packages["."]) throw new Error("config missing root package");
if (pkg.private !== true) throw new Error("root must stay private");
console.log("ok:", pkg.version);
'
```

Expected output: `ok: 0.0.0`

- [ ] **Step 5: Commit**

```bash
git add package.json release-please-config.json .release-please-manifest.json
git commit -m "ci: add release-please config and repo version"
```

---

### Task 2: Replace the release workflow

**Files:**
- Rewrite: `.github/workflows/release.yml` (replace the file entirely — every job in it is stale)

**Interfaces:**
- Consumes: from Task 1 — `release-please-config.json`, `.release-please-manifest.json`, and the root `version` field. Reads the action's unprefixed outputs `release_created` and `version`.
- Produces: images `herytz/walletko:{version}`, `herytz/walletko:latest`, `herytz/finance-to-walletko:{version}`, `herytz/finance-to-walletko:latest`, plus tag `v{version}`, `CHANGELOG.md`, and a GitHub Release.

**Context — what the old file got wrong.** It pushed `herytz/finance`; targeted a nonexistent `prod` stage; implied a root `Dockerfile`; passed `BUILD_ID`, which nothing reads; SSH-deployed into `~/finance/app` using a `docker-compose.prod.yml` and `checkhealth.mjs` that don't exist here; ran `npx release-it` with no config; and started a postgres service the tests don't use. It is replaced, not amended.

- [ ] **Step 1: Verify the walletko image builds and bakes in the version**

This proves the build args the workflow will pass actually reach the image, before trusting CI to do it. Run from the repo root:

```bash
docker build \
  -f apps/walletko/Dockerfile \
  --target runner \
  --build-arg APP_VERSION=9.9.9 \
  --build-arg APP_RELEASE_DATE=2026-07-16 \
  -t walletko:verify .
```

Expected: build completes. (First run is slow — it does a full `pnpm install` and `vite build`.)

- [ ] **Step 2: Verify `APP_VERSION` is present in the image**

```bash
docker run --rm --entrypoint printenv walletko:verify APP_VERSION
```

Expected output: `9.9.9`

This is exactly the contract the release workflow owns. `apps/walletko/src/server/functions/app-meta.fn.ts:7` reads `process.env.APP_VERSION ?? "dev"` and surfaces it through the root loader onto `/about`; if the env var is in the image, the app will report it.

- [ ] **Step 3: Verify the CLI image builds**

```bash
docker build \
  -f apps/finance-to-walletko/Dockerfile \
  --target runner \
  -t finance-to-walletko:verify .
```

Expected: build completes. No build args — it is a CLI with nothing to display a version to. Its runner is distroless and has no shell, so there is no `printenv` check to run.

- [ ] **Step 4: Replace `.github/workflows/release.yml` entirely**

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  release-please:
    name: Release PR
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      version: ${{ steps.release.outputs.version }}
      tag_name: ${{ steps.release.outputs.tag_name }}
    steps:
      - name: Release please
        id: release
        uses: googleapis/release-please-action@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

  publish:
    name: Publish images
    runs-on: ubuntu-latest
    needs: [release-please]
    if: needs.release-please.outputs.release_created == 'true'
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Resolve release date
        id: meta
        run: echo "date=$(date -u +%Y-%m-%d)" >> "$GITHUB_OUTPUT"

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USER }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push walletko
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/walletko/Dockerfile
          target: runner
          push: true
          tags: |
            herytz/walletko:${{ needs.release-please.outputs.version }}
            herytz/walletko:latest
          build-args: |
            APP_VERSION=${{ needs.release-please.outputs.version }}
            APP_RELEASE_DATE=${{ steps.meta.outputs.date }}

      - name: Build and push finance-to-walletko
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/finance-to-walletko/Dockerfile
          target: runner
          push: true
          tags: |
            herytz/finance-to-walletko:${{ needs.release-please.outputs.version }}
            herytz/finance-to-walletko:latest
```

Notes for the implementer:

- `release_created` is compared against the **string** `'true'`. Action outputs are always strings; `if: needs...outputs.release_created` alone would be truthy even when the value is `"false"`.
- The outputs are unprefixed because the package sits at path `.`. A nested package would require `.--release_created`-style names, and the publish job would silently never run.
- No `config-file` / `manifest-file` inputs are needed — Task 1 used release-please's default filenames.
- `pnpm test` runs `turbo test`, which spins up testcontainers. Docker is available on `ubuntu-latest`.

- [ ] **Step 5: Lint the workflow**

```bash
docker run --rm -v "$(pwd):/repo" --workdir /repo rhysd/actionlint:latest -color
```

Expected: no output, exit code 0. If actionlint reports unknown-secret warnings for `DOCKER_USER` / `DOCKER_TOKEN`, those are expected — it cannot see repository secrets.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: replace stale release workflow with release-please"
```

---

### Task 3: Add the dev snapshot workflow

**Files:**
- Create: `.github/workflows/snapshot.yml`

**Interfaces:**
- Consumes: nothing from earlier tasks. Deliberately independent of the version — snapshots carry no semver.
- Produces: images `herytz/walletko:dev` and `herytz/walletko:dev-{sha}`.

**Why walletko only:** `finance-to-walletko` is a one-shot migration CLI slated for removal and has no snapshot audience. It is versioned at release time only.

- [ ] **Step 1: Verify a snapshot-style build bakes in the dev version string**

```bash
docker build \
  -f apps/walletko/Dockerfile \
  --target runner \
  --build-arg APP_VERSION=dev-abc1234 \
  --build-arg APP_RELEASE_DATE=2026-07-16 \
  -t walletko:snapshot-verify .

docker run --rm --entrypoint printenv walletko:snapshot-verify APP_VERSION
```

Expected output: `dev-abc1234`

- [ ] **Step 2: Create `.github/workflows/snapshot.yml`**

```yaml
name: Snapshot

on:
  push:
    branches: [dev]

permissions:
  contents: read

jobs:
  snapshot:
    name: Publish dev image
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Resolve snapshot metadata
        id: meta
        run: |
          echo "sha=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"
          echo "date=$(date -u +%Y-%m-%d)" >> "$GITHUB_OUTPUT"

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USER }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push walletko snapshot
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/walletko/Dockerfile
          target: runner
          push: true
          tags: |
            herytz/walletko:dev
            herytz/walletko:dev-${{ steps.meta.outputs.sha }}
          build-args: |
            APP_VERSION=dev-${{ steps.meta.outputs.sha }}
            APP_RELEASE_DATE=${{ steps.meta.outputs.date }}
```

No tag, no changelog, no version bump. `:dev` always points at the newest dev build; `:dev-{sha}` pins a specific one.

- [ ] **Step 3: Lint both workflows**

```bash
docker run --rm -v "$(pwd):/repo" --workdir /repo rhysd/actionlint:latest -color
```

Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/snapshot.yml
git commit -m "ci: add dev snapshot image workflow"
```

---

## Verifying the whole thing after merge

The workflows cannot be fully exercised locally — the release-please half only runs against a real repo. Expected sequence once this lands on `main`:

1. The push to `main` runs `release.yml`. The `release-please` job opens a PR titled roughly `chore(main): release 0.1.0`. `release_created` is `false`, so `publish` is **skipped**. Nothing is pushed to Docker Hub. This is correct.
2. Merging that release PR pushes to `main` again. This time `release_created` is `true`: tag `v0.1.0` appears, `CHANGELOG.md` is written, a GitHub Release is cut, and `publish` pushes `herytz/walletko:0.1.0`, `:latest`, and the two CLI tags.
3. Confirm end to end: `docker run --rm --entrypoint printenv herytz/walletko:0.1.0 APP_VERSION` prints `0.1.0`, and `/about` in the running app reports it instead of `dev`.

## Known limitations

- **Untested `main`.** There is still no CI workflow, so nothing tests PRs. `pnpm test` in the publish job is an interim gate that only catches breakage at release time, after the commits have landed. Addressing this is separate work.
- **Release PRs do not trigger workflows.** release-please uses the default `GITHUB_TOKEN`, and GitHub deliberately refuses to trigger workflows from events raised by that token. Harmless today — the publish job keys off the `push` to `main` from the merge, not off the PR. It will matter when CI is added: the release PR itself will show no checks. The fix at that point is a PAT or a GitHub App token.
- **First release scans all history.** With no existing tags, release-please considers every commit to date. With three commits, this is fine; no `bootstrap-sha` is needed.
- **Pre-1.0 bumping uses release-please defaults.** Starting in `0.x`, a `feat:` bumps the minor (`0.1.0` → `0.2.0`) and a `feat!:`/`BREAKING CHANGE` bumps the **major**, taking you straight to `1.0.0`. If you would rather breaking changes stay inside `0.x` until you decide 1.0 has arrived, set `"bump-minor-pre-major": true` in `release-please-config.json`. Worth a deliberate choice before the first breaking change, not after.
