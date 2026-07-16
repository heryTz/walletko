# Release Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale inherited `release.yml` with a single release-please workflow that tests, tags one version for the whole repo, writes a changelog, and pushes versioned or snapshot Docker images.

**Architecture:** One workflow on `main`. A `test` job gates everything. `release-please` maintains an open release PR that accumulates changelog entries from conventional commits; merging it tags `v{version}` and publishes versioned images. Ordinary merges publish a `:main` snapshot instead. Pull requests run tests only. Nothing deploys — the pipeline ends at the registry.

**Tech Stack:** GitHub Actions, `googleapis/release-please-action@v5`, Docker Buildx, pnpm 10 / Node 22, conventional commits (enforced by commitlint).

**Spec:** `docs/superpowers/specs/2026-07-16-release-versioning-design.md`

## Status

Tasks 1–3 are **complete and committed** (`f3676ae`, `9e8e525`, `ba51222`), each reviewed clean. A final whole-branch review then found a correctness bug, and the user subsequently retired the `dev` branch — together these supersede the *structure* Tasks 2 and 3 produced. Task 1's output is unaffected and stands.

**Task 4 is the remaining work.** It supersedes Tasks 2 and 3.

| Task | Status |
| --- | --- |
| 1: Version source of truth + release-please config | ✅ Complete (`f3676ae`), stands unchanged |
| 2: Replace `release.yml` | ✅ Committed (`9e8e525`), **superseded by Task 4** |
| 3: Add `snapshot.yml` | ✅ Committed (`ba51222`), **superseded by Task 4** (file is deleted) |
| 4: Consolidate into one workflow | ⬜ **Remaining** |

## Global Constraints

- **One version for the whole repo.** Root `package.json` is the only versioned manifest. `apps/*` and `packages/email` stay unversioned and ride along.
- **`main` only.** `dev` is retired. Feature branches come off `main` and squash-merge back.
- **Release only — never deploy.** No SSH, no compose, no healthcheck. The pipeline ends at a tagged image in the registry.
- **Root stays `private: true`.** release-please bumps and tags; it never publishes to npm.
- **Image names:** `herytz/walletko`, `herytz/finance-to-walletko`.
- **Docker build context is the repo root** (`.`) for both images — the Dockerfiles `COPY . .` and use `pnpm --filter`.
- **Both Dockerfiles' final stage is named `runner`.** There is no `prod` stage.
- **Use `pnpm install --frozen-lockfile`** wherever pnpm is installed.
- **Node 22**, matching `node:22-alpine` in both Dockerfiles.
- **No postgres service.** Both apps' tests provision their own database via `@testcontainers/postgresql` (`apps/walletko/tests/integration/setup.ts`, `apps/finance-to-walletko/src/test-helpers.test.ts`).
- **Existing secrets, reused as-is:** `DOCKER_USER`, `DOCKER_TOKEN`.
- **`APP_RELEASE_DATE` is UTC `YYYY-MM-DD`**; **`APP_VERSION`** is the release version, or `main-{sha}` for snapshots. `apps/walletko/src/server/functions/app-meta.fn.ts:7` reads `process.env.APP_VERSION ?? "dev"`.

---

### Task 4: Consolidate into one workflow

**Files:**
- Rewrite: `.github/workflows/release.yml`
- Delete: `.github/workflows/snapshot.yml`

**Interfaces:**
- Consumes: Task 1's `release-please-config.json`, `.release-please-manifest.json`, and the root `version` field. Reads the action's unprefixed outputs `release_created` and `version` (unprefixed because the package sits at path `.`).
- Produces: `herytz/walletko:{version}` + `:latest`, `herytz/finance-to-walletko:{version}` + `:latest` on release; `herytz/walletko:main` + `:main-{sha}` on ordinary merges; tag `v{version}`, `CHANGELOG.md`, GitHub Release.

**Why this task exists — two drivers:**

1. **A correctness bug.** The committed `release.yml` runs `pnpm test` *inside* the `publish` job, which is gated on `release_created == 'true'`. That output is only true *after* release-please has already pushed the tag, written the changelog, and cut the Release. A failing test therefore cannot stop a release — it strands one: `v0.1.0` exists with no image in the registry, and `:latest` silently still points at the previous version. `test` must run **before** `release-please`, not after.
2. **`dev` is retired.** `snapshot.yml` triggers on `push: branches: [dev]` and would silently never run again. Snapshots are load-bearing (they were chosen instead of semver prereleases), so they move to `main` and are renamed `:dev` → `:main`.

- [ ] **Step 1: Verify the snapshot-style build bakes in the new version string**

The tag naming changed from `dev-{sha}` to `main-{sha}`, so re-verify the build arg reaches the image. Earlier builds warmed the Docker cache; only the final stage should rebuild.

```bash
docker build \
  -f apps/walletko/Dockerfile \
  --target runner \
  --build-arg APP_VERSION=main-abc1234 \
  --build-arg APP_RELEASE_DATE=2026-07-16 \
  -t walletko:main-verify .

docker run --rm --entrypoint printenv walletko:main-verify APP_VERSION
```

Expected output: `main-abc1234`

- [ ] **Step 2: Rewrite `.github/workflows/release.yml` entirely**

```yaml
name: Release

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  test:
    name: Test
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

  release-please:
    name: Release PR
    runs-on: ubuntu-latest
    needs: [test]
    if: github.event_name == 'push'
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
    name: Publish release images
    runs-on: ubuntu-latest
    needs: [release-please]
    if: github.event_name == 'push' && needs.release-please.outputs.release_created == 'true'
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

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

  snapshot:
    name: Publish snapshot image
    runs-on: ubuntu-latest
    needs: [release-please]
    if: github.event_name == 'push' && needs.release-please.outputs.release_created != 'true'
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

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
            herytz/walletko:main
            herytz/walletko:main-${{ steps.meta.outputs.sha }}
          build-args: |
            APP_VERSION=main-${{ steps.meta.outputs.sha }}
            APP_RELEASE_DATE=${{ steps.meta.outputs.date }}
```

Notes for the implementer — each of these is deliberate:

- **`test` has no `if`**, so it runs on both events and gates everything downstream. This is the whole point of the task.
- **`publish` and `snapshot` no longer install pnpm or Node.** They only build Docker images, and the Dockerfiles run their own `pnpm install` internally. The committed version installed the toolchain to run `pnpm test`; with `test` extracted, that setup is dead weight.
- **The explicit `github.event_name == 'push'` guard on `publish` and `snapshot` is load-bearing, not redundant.** GitHub's docs state a skipped job "reports its status as Success," and do not clearly document whether a skipped `needs` propagates the skip downstream. If it does not, then on a pull request `release-please` is skipped, `needs.release-please.outputs.release_created` is the empty string, `'' != 'true'` evaluates **true**, and `snapshot` would push a `:main` image from a PR. The event guard makes both jobs correct under either semantics. Do not "simplify" it away.
- **`release_created` is compared against the string `'true'`.** Action outputs are always strings; a bare truthiness check passes even when the value is `"false"`.
- **The outputs are unprefixed** (`release_created`, not `.--release_created`) because the package sits at path `.` in the manifest.
- **`concurrency` with `cancel-in-progress` only on pull requests.** Two rapid pushes to `main` must queue, never cancel — cancelling could abort a release mid-flight. Two pushes to a PR branch should cancel the stale run. Without any concurrency group, two `main` pushes race and the slower build wins, leaving `:main` pointing at the *older* commit.
- **No `config-file` / `manifest-file` inputs** — Task 1 used release-please's default filenames.
- `version` has no `v` prefix (`0.1.0`); `tag_name` does (`v0.1.0`). Image tags use `version`.

- [ ] **Step 3: Delete the now-superseded snapshot workflow**

```bash
git rm .github/workflows/snapshot.yml
```

Its `push: branches: [dev]` trigger is dead — `dev` is retired. Its job now lives in `release.yml` as `snapshot`.

- [ ] **Step 4: Lint the workflow**

```bash
docker run --rm -v "$(pwd):/repo" --workdir /repo rhysd/actionlint:latest -color
```

Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: consolidate release and snapshot into one gated workflow"
```

---

## Verifying after merge

The release-please half only runs against a real repo. Expected sequence once this lands on `main`:

1. **A pull request to `main`:** `test` runs. `release-please`, `publish`, and `snapshot` are all skipped. Nothing is pushed to Docker Hub.
2. **An ordinary merge to `main`:** `test` runs, then `release-please` opens or updates a PR titled roughly `chore(main): release 0.1.0`. `release_created` is `false`, so `publish` is skipped and `snapshot` pushes `herytz/walletko:main` and `:main-{sha}`. No tag, no release.
3. **Merging the release PR:** `test` runs, then `release_created` is `true`: tag `v0.1.0` appears, `CHANGELOG.md` is written, a GitHub Release is cut, and `publish` pushes `herytz/walletko:0.1.0`, `:latest`, and the two CLI tags. `snapshot` is skipped.
4. **Confirm end to end:** `docker run --rm --entrypoint printenv herytz/walletko:0.1.0 APP_VERSION` prints `0.1.0`, and `/about` in the running app reports it instead of `dev`.

## Required repository settings

Not code; must be done before the first push to `main`.

1. **Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"** must be **enabled**, or release-please's first run hard-fails with `GitHub Actions is not permitted to create or approve pull requests`.
2. **Squash merge commit message: leave on "Default".** Do not pin it to "Pull request title" — the default is what lets commitlint cover single-commit PRs automatically.

## Known limitations

- **The release PR shows no checks.** release-please uses the default `GITHUB_TOKEN`, and GitHub refuses to trigger workflows from events raised by that token. So despite `pull_request` being a trigger, the release PR itself displays none. The gate still holds — merging it pushes to `main`, which runs `test` before `release-please`. Fixing the cosmetics needs a PAT or GitHub App token.
- **Multi-commit PR titles are unguarded.** Single-commit PRs squash using their own commitlint-verified message. PRs with 2+ commits use the PR title, which nothing validates. Detected by reviewing the release PR before merging.
- **First release scans all history.** No existing tags, so release-please considers every commit to date. Fine at this size; no `bootstrap-sha` needed.
- **Pre-1.0 bumping uses release-please defaults.** In `0.x`, a `feat:` bumps minor and a `feat!:` bumps **major**, going straight to `1.0.0`. To keep breaking changes inside `0.x`, set `"bump-minor-pre-major": true`. Worth deciding before the first breaking change.
- **Partial publish.** If walletko pushes and the CLI build then fails, `herytz/walletko:latest` has advanced while the CLI's has not, with no rollback. Low impact — the CLI is slated for removal.
- **Actions are pinned to floating major tags.** The spec notes release-please's cadence is uneven; SHA-pinning would also close a supply-chain path into a workflow holding `contents: write` and Docker Hub credentials. Deferred.
