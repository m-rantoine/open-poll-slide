---
name: launch-new-features
description: Wrap up the current open-poll-slide feature branch and release it — checks, tests, changeset, merge to main, version bump, changelog page, pack check, then publish to npm after the user confirms. Use when the user types /launch-new-features, or says the feature is done, finished, ready, or asks to wrap up, ship, release or publish it.
---

# Launch new features

Run from the feature branch. Stop and report on any failure; never skip a step or paper over it. Never run `npm publish` or `pnpm release` locally: publishing happens in GitHub Actions (`.github/workflows/release.yml`) when versions are pushed to `main`.

1. **Preflight.** `git branch --show-current` must not be `main`. `git status --short` must show nothing but untracked `.idea/`; commit or ask about the rest. `git log --oneline origin/main..HEAD` shows what ships. If it is empty, say so and stop.
2. **Tests on the branch.** `pnpm check:fix`, `pnpm typecheck`, `pnpm test`. Fix what fails (locale keys missing in `fr-ca`, inspector hooks missing for a new prop) and rerun until green. Commit fixes.
3. **Changeset.** If the diff touches `packages/core` or `packages/cli` and the branch has no new `.changeset/*.md`, write one. Packages: `@rantoine/open-poll-slide-core`, `@rantoine/open-poll-slide-cli`. Pick the bump from the diff: `patch` fixes and polish, `minor` new public API or poll types, `major` breaking. Show the user the bump and the one-line, present-tense description before writing. Include the CLI whenever core's version changes, since it writes `^<core version>` into new projects. `apps/*`-only changes need no changeset and no release: merge and stop after step 4.
4. **Merge to main.** `git checkout main`, `git pull --ff-only origin main`, `git merge --no-ff <branch>`. On conflicts, stop and ask. Rerun `pnpm test` on the merged result.
5. **Version.** `pnpm changeset version` consumes the changesets and edits `package.json` and `CHANGELOG.md` files. Commit as `chore: release packages`. Never edit versions or changelogs by hand.
6. **Changelog page.** If a new minor or major was cut, add the `/changelog` entry with the `changelog-entry` skill (`apps/web/lib/changelog.ts`) and commit. Then `pnpm exec vitest run apps/web/lib`; it fails on `main` if a released version is missing.
7. **Pack check on core.** `pnpm --filter @rantoine/open-poll-slide-core build`, `pnpm pack` in `packages/core`, install the tarball into a project made by `open-slide init`, run `open-slide dev` and load a few pages. Also build the CLI and confirm `init` writes the new core range.
8. **Ask.** Show the new versions, the changelog text, and the test and pack results. Use AskUserQuestion: publish now, or stop. On stop, leave everything local and say how to undo (`git reset --hard origin/main`).
9. **Publish.** On yes, `git push origin main`. The Release workflow publishes core, then the CLI, with provenance. Watch it with `gh run watch`, then confirm with `npm view @rantoine/open-poll-slide-core version` and the same for the CLI. Delete the merged feature branch (`git branch -d`, and `git push origin --delete <branch>` if it was pushed).
