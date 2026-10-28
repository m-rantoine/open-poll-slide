---
name: launch-new-features
description: Release open-poll-slide to npm — review the bot's "chore: release packages" PR, add the changelog page entry, run the pack check, merge. Use when the user wants to release, publish, ship, launch or cut a version of core or the CLI.
---

# Launch new features

Releases are automatic once the release PR merges: `.github/workflows/release.yml` runs `changesets/action` on every push to `main`. Merging the PR publishes. Never run `changeset version` or `pnpm release` locally, never edit versions or `CHANGELOG.md`, and do not merge the release PR yourself; the user does.

1. **Check there is something to release.** `ls .changeset/*.md` (ignoring `README.md`). None means nothing to ship.
2. **Find the release PR.** After the feature PRs are on `main`, the bot opens or updates "chore: release packages" (`changeset-release/main`). Use `gh pr list --search "chore: release packages"`. If it is missing, check the Release workflow run on `main`.
3. **Review its diff.** The `CHANGELOG.md` diff is the source of truth. Confirm the bumps are right (core and CLI), and that the CLI is included whenever core is, because the CLI writes `^<core version>` into new projects.
4. **Add the changelog page entry as the last commit on the release PR branch**, using the `changelog-entry` skill (`apps/web/lib/changelog.ts`). Run `pnpm exec vitest run apps/web/lib` to confirm. The bot force-pushes the branch when `main` moves, so add this right before merging.
5. **Pack check before publishing core.** `pnpm pack` in `packages/core`, install the tarball into a project made by `open-slide init`, run `open-slide dev` and load a few pages. `pnpm publish` also runs `scripts/check-package.mjs`.
6. **Hand over to the user** to merge the PR. After it merges, confirm the Release run succeeded and the versions are on npm (`npm view @rantoine/open-poll-slide-core version`, same for the CLI), and that a fresh `init` writes the new core range.
