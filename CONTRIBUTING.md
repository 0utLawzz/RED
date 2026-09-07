# Contributing to RED

Thank you for helping improve RED.

## Development setup

1. Fork and clone the repository.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open the URL printed by Vite (typically `http://localhost:8080`).

## Guidelines

- Prefer TypeScript and existing patterns under `src/lib/audio` and `src/components`.
- Run `npm run typecheck` and `npm run lint` before opening a PR.
- Keep PRs focused; describe the change and the reason.
- Do not add server-side audio processing — the privacy model is client-only.

## Pull requests

- Reference related issues when applicable.
- Ensure `npm run build` succeeds.

## Security

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
