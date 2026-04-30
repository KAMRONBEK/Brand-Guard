<div align="center">
<br />
<br />
<img src="./src/assets/icons/ic-logo-badge.svg" height="140" alt="Brand Guard logo" />
<h3>Brand Guard</h3>
<p style="font-size: 14px">
  Social listening and brand monitoring admin — React 19, Vite, TypeScript, and a modern UI stack.
</p>
</div>

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001).

Copy `.env.example` to `.env` and adjust values as needed. Optional branding links:

- `VITE_APP_DOCS_URL` — shows “Document” in the account menu when set.
- `VITE_APP_REPOSITORY_URL` — shows the GitHub icon in the header when set.
- `VITE_APP_COMMUNITY_URL` — shows the Discord icon in the header when set.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `pnpm dev`     | Start Vite dev server    |
| `pnpm build`   | Typecheck + production build |
| `pnpm preview` | Preview production build |

## Attribution

UI shell and patterns are derived from [Slash Admin](https://github.com/d3george/slash-admin) (MIT). Original template copyright remains with its authors; Brand Guard-specific changes are under this project’s license.

## Commit conventions

- `feat` — new features  
- `fix` — bug fixes  
- `docs` — documentation  
- `style` — formatting only  
- `refactor` — refactors  
- `perf` — performance  
- `revert` — revert a commit  
- `test` — tests  
- `chore` — tooling / maintenance  
- `ci` — CI config  
- `types` — type-only changes  
- `wip` — work in progress  
