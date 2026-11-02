# Contributing to Morrow

Bug reports and focused pull requests are welcome. Include what you expected,
what happened, and steps to reproduce. For time zone issues, include the date,
time zones, and browser version. Use fictional names and schedules.

## Local checks

Use Node.js 22.18+ or 24+.

```bash
npm ci
npm test
npm run lint
npm run build
```

Keep the static, browser-only architecture. Explain any new dependencies,
network requests, storage, or privacy changes in your pull request. Add a
regression test for changes to scheduling, sharing, or calendar export logic.
Never commit credentials, personal schedules, or `.env` files.

Contributions are provided under the project's MIT license.
