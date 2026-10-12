---
'@rantoine/open-poll-slide-core': patch
---

Fix the package missing `src/live-site.ts`, which stopped `open-slide dev` from starting in installed projects (0.5.0 and 0.6.0). Check every shipped import before publishing.
