# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/wasu-tenan/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/wasu-tenan/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar: a web dashboard that reads the sealed DefiLlama snapshot, finds every protocol that records no token yet (and is not a wrapped, staked or bridged product of one that trades), ranks them by an implied launch value derived from the snapshot's own figures — each category priced by the median market-cap-per-TVL of its live protocols — and gives every protocol a concrete six-step farm plan with costs and times. The board covers all 40 watchlist protocols plus 158 early finds below the floor (198 rows), with a detail view per protocol, filters, a live-token comps view, and the full model stated on the page with a working sandbox.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to-snapshot.json>
```

Then open `out/dashboard/index.html` in a browser. The program writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`. Node.js 22.18 or later; standard library only; no network.

---

Entered on [make.fun](https://make.fun/?ref=2mmz0hmg&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash
