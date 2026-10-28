---
name: update-from-poll-slide
description: Pull the latest changes from the upstream open-slide/open-slide repo into this open-poll-slide fork and merge them. Use when the user wants to update from upstream, sync with the original repo, pull in open-slide changes, or check whether the fork is behind.
---

# Update from upstream

The fork keeps its own versions (`@rantoine/open-poll-slide-*`, 0.x/1.x). Upstream (`@open-slide/*`) is on a different number line; never try to match it.

1. **Remote.** `git remote -v`. If `upstream` is missing: `git remote add upstream https://github.com/open-slide/open-slide.git`.
2. **Am I behind?** `git fetch upstream --tags`, then `git log --oneline HEAD..upstream/main`. No output means current; tell the user and stop. Otherwise summarise what is new.
3. **Branch.** From a clean `main`: `git checkout -b merge-upstream-<latest upstream core version>`. Then `git merge upstream/main --no-edit`.
4. **Resolve conflicts** (`git diff --name-only --diff-filter=U`):
   - `packages/core/package.json`: keep the fork's `name`, `version`, `description`; take upstream's other changes (dependencies, `files`).
   - `packages/*/CHANGELOG.md`: keep the fork's.
   - `pnpm-lock.yaml`: `git checkout --ours pnpm-lock.yaml`, then `pnpm install --no-frozen-lockfile`.
   - Locale files, `config.ts`, `index.ts`, `AGENTS.md`/`CLAUDE.md`: keep both sides; do not drop fork code (`live`, `tools`, poll components, `PracticeProvider`).
   - `player.tsx`, `slide.tsx`, `thumbnail-rail.tsx`: merge by hand so fork behaviour (`locked`, `navRef`, `contained`, practice mode) and upstream's additions both survive.
   Check no markers remain: `grep -rn '^<<<<<<<' . --exclude-dir=node_modules --exclude-dir=.git`.
5. **Fix the fork-only pieces.** `fr-ca.ts` exists only here: add and remove keys until `pnpm exec tsc --noEmit` in `packages/core` passes. Translate new strings into French (Canada).
6. **Changesets.** Upstream's pending `.changeset/*.md` name `@open-slide/core`, which does not exist here and breaks `changeset version`. Delete them, and write one changeset for `@rantoine/open-poll-slide-core` summarising what the merge brings (`minor` for new features, `patch` for fixes only, `major` only if the user asks). Add a CLI changeset too if core's range changes meaningfully, since new projects get the core version from the CLI build.
7. **Verify.** `pnpm check:fix`, `pnpm typecheck`, `pnpm test`.
8. **Commit** the merge, open a PR to `main`, and tell the user which upstream release the fork now includes. Releasing is the `launch-new-features` skill.
