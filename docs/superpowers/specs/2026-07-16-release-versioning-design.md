# Release Versioning Design

**Date:** 2026-07-16
**Status:** Approved

## Problem

`.github/workflows/release.yml` is inherited from the earlier "finance" project and cannot run successfully today:

- Pushes to Docker Hub as `herytz/finance`.
- Builds `target: prod`, a stage that does not exist. `apps/walletko/Dockerfile` defines `base`, `build`, and `runner`.
- Builds from an implied root `Dockerfile`. Dockerfiles live at `apps/walletko/Dockerfile` and `apps/finance-to-walletko/Dockerfile`.
- Passes `BUILD_ID`, which nothing in the repo reads.
- SSH-deploys into `~/finance/app` using `docker-compose.prod.yml` and `checkhealth.mjs`, neither of which exists here.
- Runs `npx release-it` with no `release-it` configuration anywhere in the repo.
- Provisions a postgres service for `finance_test` on port 5433, unused by walletko's tests.

The repo has no git tags, no version field outside `packages/email`, and no changelog.

Meanwhile `apps/walletko` is already built to report its own version and never receives one. `apps/walletko/src/server/functions/app-meta.fn.ts:7` reads:

```ts
version: process.env.APP_VERSION ?? APP_VERSION_FALLBACK,  // fallback: "dev"
releaseDate: process.env.APP_RELEASE_DATE ?? null,
```

and `apps/walletko/Dockerfile` declares `APP_VERSION` and `APP_RELEASE_DATE` as build args promoted to env. Feeding these is a goal of this design, not an extra.

## Decisions

| Decision | Choice |
| --- | --- |
| Release unit | One version for the whole repo |
| Trigger | Release PR, merged when the maintainer decides |
| Scope | Release only — tag, changelog, image. No deploy. |
| Deploy | Out of scope; GitOps, not yet built |
| Prerelease | None. Dev snapshot images instead. |
| Library | `release-please` |

### Why one repo version

Solo-maintained product, nothing published to npm, no consumer pins a version. A single number ("walletko is at 1.4.0") is the least machinery that answers every question actually asked of it.

### Why a release PR

Work accumulates in a bot-maintained PR that recomputes its changelog and version on every merge to `main`. Nothing ships until that PR is merged. The batching boundary is the maintainer's judgement, not a schedule.

### Why no prerelease

A prerelease version exists so someone else can opt into an unfinished build by pinning it. Walletko has no such consumer, and the open release PR already serves as a visible, unshipped staging area. Dev snapshot images deliver the real want — a runnable artifact before it is blessed — without a second version axis. If outside testers ever appear, release-please's `prerelease-type: rc` on `dev` remains available and nothing here is wasted.

### Why release-please

The decisions above eliminate the alternatives:

- **changesets** — exists for per-package versions and npm publishing. Neither applies. Would also require hand-authored changeset files per PR.
- **semantic-release** — releases on every merge by design. Contradicts batch-until-decided.
- **release-it** — built for release-now, offers no accumulating staging area.
- **release-please** — the release-PR model is its core idea, and it reads the conventional commits already enforced by commitlint. Runs as an action; adds no dependency to `package.json`.

Caveats accepted: it is effectively the only mainstream tool with this model, so it wins by fit rather than by competition; and it is a heavy Google-maintained action with an uneven release cadence. Fallback if it stalls: `git-cliff` for the changelog plus a dispatch-driven tag, giving up the accumulating PR.

## Design

### Version source of truth

Root `package.json` gains `"version": "0.1.0"`. It stays `private: true` — release-please bumps the field and tags, and never publishes.

- `.release-please-config.json` — `release-type: node`, `package-name: walletko`, single package at `.`
- `.release-please-manifest.json` — tracks the current version

`apps/*` and `packages/email` keep their package.json files untouched and unversioned. They ride the repo version.

### `release.yml` — on push to `main`

1. **release-please job** — maintains the release PR. Outputs `release_created`, `tag_name`, `version`. Ordinary merges only update the PR.
2. **publish job** — `if: release_created`. Runs `pnpm test` first and stops the release if it fails, then builds and pushes both images at the release version:
   - `herytz/walletko:{version}` and `:latest`, with build args `APP_VERSION={version}` and `APP_RELEASE_DATE={date}`, where `{date}` is the UTC build date as `YYYY-MM-DD`, matching the format the app is already exercised with
   - `herytz/finance-to-walletko:{version}` and `:latest`, no build args — it is a CLI with nothing to display

Merging the release PR tags `v{version}`, writes `CHANGELOG.md`, cuts a GitHub Release, and pushes both images. It does not deploy.

### `snapshot.yml` — on push to `dev`

Builds and pushes `herytz/walletko:dev` and `:dev-{sha}` with `APP_VERSION=dev-{sha}`. No tag, no changelog, no version bump. `finance-to-walletko` is excluded — it is being retired and has no snapshot audience.

### Removals

From `release.yml`: the `deploy` job, the `release-it` job, `target: prod`, `BUILD_ID`, the `herytz/finance` image name, and the postgres service block (walletko's tests use `@testcontainers/postgresql` and provision their own database).

## Out of scope

- **Deploy.** GitOps, not yet designed. This pipeline ends at a tagged image in the registry. Because no reconciler exists yet, images carry both an exact version tag and `latest`, which keeps both image-tag automation and manifest-pinning open.
- **`finance-to-walletko` retirement.** Versioned alongside walletko for now; slated for removal. Deleting it later means deleting one job.
- **CI.** `release.yml` is currently the only workflow, so nothing tests PRs, and `pnpm test` at release time is too late to gate anything. This is a real gap but separate work, to be addressed next.

## Risks

- **Untested `main`.** Until CI exists, the release PR can accumulate commits that were never tested. The publish job runs `pnpm test` as an interim gate, but this only catches breakage at release time, after the commits have already landed.
- **Stale lockfile handling.** The old workflow used `pnpm install --no-frozen-lockfile`, which defeats the lockfile's purpose in automation. New workflows use `--frozen-lockfile`.
- **First release.** Starting at `0.1.0` with no existing tags means release-please has no history to read; the first release PR covers all commits to date.
