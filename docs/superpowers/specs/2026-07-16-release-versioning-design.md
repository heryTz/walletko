# Release Versioning Design

**Date:** 2026-07-16
**Status:** Approved (revised 2026-07-16 after implementation review)

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
| Prerelease | None. `:main` snapshot images instead. |
| Branching | `main` only. Feature branches off `main`; `dev` is retired. |
| Merge strategy | Squash-merge, GitHub's default squash message |
| Library | `release-please` |

### Why one repo version

Solo-maintained product, nothing published to npm, no consumer pins a version. A single number ("walletko is at 1.4.0") is the least machinery that answers every question actually asked of it.

### Why a release PR

Work accumulates in a bot-maintained PR that recomputes its changelog and version on every merge to `main`. Nothing ships until that PR is merged. The batching boundary is the maintainer's judgement, not a schedule.

### Why `main` only

The repo previously carried a long-lived `dev` branch. Retiring it makes the release PR the *single* batching boundary. With `dev`, work was batched twice — once by `dev`→`main`, once by the release PR — which reduced the release PR to a rubber stamp. Feature branches now come off `main` and squash-merge back.

### Why squash-merge

release-please's own documentation: *"We **highly** recommend that you use squash-merges when merging pull requests."* Its reasoning is linear history (`git bisect` stays useful, `main` never contains a red intermediate commit) and changelog quality — commits like "fix typo" make sense inside a PR but pollute release notes on `main`.

What release-please parses depends on the PR's commit count, per GitHub's **default** squash message setting:

> "the commit title and message if the pull request contains only 1 commit, or the pull request title and list of commits if the pull request contains 2 or more commits."

So a **single-commit PR** squashes using that commit's own message — which commitlint (husky-driven) has already forced to be conventional. The PR title is never consulted. Only **multi-commit PRs** fall back to the PR title, which commitlint cannot see, since it is typed in the GitHub UI.

This is why the squash setting is deliberately left on **Default** rather than pinned to "Pull request title". Pinning would trade commitlint's automatic coverage of the single-commit case for a manual title convention on every PR — more exposure, not less, in exchange for one consistent rule.

No PR-title lint and no title automation. For the residual multi-commit case, the failure is self-detecting: the release PR is reviewed before merging, and a missing changelog entry is visible exactly when attention is on it. A title lint becomes worthwhile when other people contribute, since they have neither the hooks nor the habit.

Auto-prefixing titles with a default type (e.g. always `fix:`) was considered and rejected. The prefix is the semantic payload, not boilerplate: it decides patch vs. minor vs. major. Defaulting it would silently release every feature as a patch. Whether a change is a fix or a feature is a judgement about meaning and cannot be derived mechanically.

### Why no prerelease

A prerelease version exists so someone else can opt into an unfinished build by pinning it. Walletko has no such consumer, and the open release PR already serves as a visible, unshipped staging area. `:main` snapshot images deliver the real want — a runnable artifact before it is blessed — without a second version axis. If outside testers ever appear, release-please's `prerelease-type: rc` remains available and nothing here is wasted.

### Why release-please

The decisions above eliminate the alternatives:

- **changesets** — exists for per-package versions and npm publishing. Neither applies. Would also require hand-authored changeset files per PR.
- **semantic-release** — releases on every merge by design. Contradicts batch-until-decided.
- **release-it** — built for release-now, offers no accumulating staging area.
- **release-please** — the release-PR model is its core idea, and it reads the conventional commits already enforced by commitlint. Runs as an action; adds no dependency to `package.json`.

Caveats accepted: it is effectively the only mainstream tool with this model, so it wins by fit rather than by competition; and it is a heavy Google-maintained action with an uneven release cadence. Fallback if it stalls: `git-cliff` for the changelog plus a dispatch-driven tag, giving up the accumulating PR.

## Design

### Version source of truth

Root `package.json` carries `"version"`, seeded at `0.0.0`. It stays `private: true` — release-please bumps the field and tags, and never publishes.

- `release-please-config.json` — `release-type: node`, `package-name: walletko`, single package at `.`, `include-component-in-tag: false`
- `.release-please-manifest.json` — records the **last released** version

`0.0.0` is the honest seed: nothing has been released. Because the manifest records the last release rather than the next one, seeding `0.1.0` would make the first release `0.2.0`. Seeding `0.0.0` makes the first release PR propose `0.1.0`.

`apps/*` and `packages/email` keep their package.json files untouched and unversioned. They ride the repo version.

### One workflow: `release.yml`

Triggers on `push` to `main` and `pull_request` targeting `main`. Four jobs:

| Job | Runs when | Does |
| --- | --- | --- |
| `test` | every push and PR | `pnpm install --frozen-lockfile`, `pnpm test` |
| `release-please` | `needs: [test]`, push only | Maintains the release PR. Outputs `release_created`, `version`, `tag_name`. |
| `publish` | `needs: [release-please]`, `if release_created == 'true'` | Pushes versioned images |
| `snapshot` | `needs: [release-please]`, `if release_created != 'true'` | Pushes `:main` images |

**`test` gates everything.** `release-please` declares `needs: [test]`, so red tests block the tag rather than stranding a release. This ordering is load-bearing: if tests ran *after* `release-please`, a failure would leave `v0.1.0` tagged and released with no image in the registry, while `:latest` silently still pointed at the previous version.

On a pull request, `release-please` is skipped, so `publish` and `snapshot` skip with it — PRs run tests and nothing else.

**`publish`** builds from the release version:
- `herytz/walletko:{version}` and `:latest`, with build args `APP_VERSION={version}` and `APP_RELEASE_DATE={date}`, where `{date}` is the UTC build date as `YYYY-MM-DD` — the format the app is already exercised with
- `herytz/finance-to-walletko:{version}` and `:latest`, no build args — it is a CLI with nothing to display

**`snapshot`** builds `herytz/walletko:main` and `:main-{sha}` with `APP_VERSION=main-{sha}`. No tag, no changelog, no version bump. `finance-to-walletko` is excluded — it is being retired and has no snapshot audience.

The `version` output has no `v` prefix (`0.1.0`); `tag_name` does (`v0.1.0`). Image tags use `version`.

### Removals

From `release.yml`: the `deploy` job (SSH into `~/finance/app`, `docker-compose.prod.yml`, the missing `checkhealth.mjs`), the `release-it` job, `target: prod`, `BUILD_ID`, the `herytz/finance` image name, and the postgres service block (walletko's tests use `@testcontainers/postgresql` and provision their own database).

## Required repository settings

One setting to change, one to deliberately leave alone. Neither is code.

1. **Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"** must be **enabled** before the first push to `main`. release-please opens its release PR under the default `GITHUB_TOKEN`; without this, the first run hard-fails with `GitHub Actions is not permitted to create or approve pull requests`.
2. **Squash merge commit message: leave on "Default".** Do not pin it to "Pull request title" — see "Why squash-merge". The default is what lets commitlint cover single-commit PRs automatically.

## Out of scope

- **Deploy.** GitOps, not yet designed. This pipeline ends at a tagged image in the registry. Because no reconciler exists yet, images carry both an exact version tag and `latest`, which keeps both image-tag automation and manifest-pinning open.
- **`finance-to-walletko` retirement.** Versioned alongside walletko for now; slated for removal. Deleting it later means deleting one job.
- **PR-title linting and title automation.** See "Why squash-merge" — deliberately deferred until there are other contributors.

## Risks

- **Multi-commit PR titles are unguarded.** Single-commit PRs are covered by commitlint. For PRs with 2+ commits, GitHub uses the PR title, which nothing validates — a non-conventional title contributes nothing to the changelog and no version bump. Detected by reviewing the release PR; recovered with a follow-up conventional commit or a `Release-As:` footer, since the squashed commit cannot be retitled after the fact.
- **`:latest` is mutable.** Until a GitOps reconciler exists, the only consumer is a human running `docker run`, who gets a tag that changes underneath them. The exact version tag is always available for pinning.
- **Partial publish.** If the walletko image pushes and the CLI build then fails, `herytz/walletko:latest` has advanced while the CLI's has not, with no tag or release rollback. Low impact — the CLI is slated for removal.
- **First release scans all history.** With no existing tags, release-please considers every commit to date. With a handful of commits this is fine; no `bootstrap-sha` is needed.
- **Pre-1.0 bumping uses release-please defaults.** In `0.x`, a `feat:` bumps the minor (`0.1.0` → `0.2.0`) and a `feat!:`/`BREAKING CHANGE` bumps the **major**, going straight to `1.0.0`. To keep breaking changes inside `0.x`, set `"bump-minor-pre-major": true`. Worth deciding before the first breaking change.
- **Release PRs do not trigger workflows.** release-please uses the default `GITHUB_TOKEN`, and GitHub refuses to trigger workflows from events raised by that token. The release PR itself will therefore show no checks, even though `pull_request` is a trigger. The `push` to `main` on merge still runs everything, so the release remains gated. Fixing the missing checks would need a PAT or GitHub App token.
