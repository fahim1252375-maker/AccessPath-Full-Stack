# Contributing to AccessPath

Thank you for your interest in improving AccessPath. Contributions that improve correctness, accessibility, security, documentation, and maintainability are welcome.

## Before you start

1. Read the [README](./README.md), [accessibility methodology](./docs/accessibility-methodology.md), and [threat model](./docs/threat-model.md).
2. Search existing issues and pull requests to avoid duplicate work.
3. For a substantial change, open an issue first to discuss scope and approach.
4. Never include real personal data, API keys, credentials, or private campus information in commits, screenshots, fixtures, or tests.

## Development setup

```bash
git clone https://github.com/fahim1252375-maker/AccessPath-Full-Stack.git
cd AccessPath-Full-Stack
npm install
cp .env.example .env
```

For a local setup without a Gemini key, configure `AI_PROVIDER="mock"` in `.env`, then run:

```bash
npm run dev
```

See the README and [deployment documentation](./docs/deployment.md) for database and environment options.

## Making a change

- Keep changes focused and explain the user or engineering problem they solve.
- Follow existing TypeScript, React, Express, validation, and error-handling patterns.
- Add or update tests for behavior changes.
- Update relevant documentation and the feature registry when a documented feature changes.
- Preserve bilingual behavior where user-facing copy is added or changed.
- Do not weaken accessibility constraints or convert unverified/simulated data into verified facts.
- Do not claim a route, facility, or building is accessible based only on AI output or synthetic demo data.

## Quality checks

Run the checks that apply to your change:

```bash
npm run format:check
npm run lint
npm test
npm run test:simulation
npm run build
```

For UI or browser behavior, also consider:

```bash
npm run test:e2e
```

If a check cannot run because dependencies, browser binaries, network access, or external services are unavailable, state that clearly in your pull request. Do not report a skipped or blocked check as passed.

## Pull request checklist

- [ ] The change has a clear, focused purpose.
- [ ] Tests were added or updated where appropriate.
- [ ] Relevant quality checks were run and their results are reported accurately.
- [ ] Documentation and feature records are updated where needed.
- [ ] No secrets, personal data, or real campus-sensitive information are included.
- [ ] User-facing changes preserve keyboard, screen-reader, contrast, and bilingual considerations.
- [ ] Limitations and follow-up work are documented.

## Commit and review

Use concise commit messages that describe the change, for example:

- `feat: add accessible route filter`
- `fix: prevent stale facility status from appearing current`
- `docs: clarify local development setup`
- `test: cover route verification expiry`

Be respectful and constructive in reviews. Maintainers may request changes, clarification, tests, or documentation before merging.

## Code of Conduct

All contributors are expected to follow the project's [Code of Conduct](./CODE_OF_CONDUCT.md).
