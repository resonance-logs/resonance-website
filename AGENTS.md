# AGENTS / Project overview

This repository (resonance-website) is a small monorepo with a Next.js + React frontend and a Go backend. Below are concise notes for AI agents, contributors, or automation scripts about which technologies to use, where to find important code, and common developer commands.

## Project layout

- `app/` — Frontend (Next.js, App Router, TypeScript). Key files:
	- `app/src/app/layout.tsx` and `app/src/app/page.tsx` — top-level app layout and pages
	- `app/postcss.config.mjs`, `app/tsconfig.json`, `app/next.config.ts`, `app/package.json`
	- `app/public/` — static assets

- `server/` — Backend (Go). Key files:
	- `server/main.go` — server entrypoint
	- `server/go.mod` — Go module
	- `server/bin/` — compiled binaries (gitignored or generated)

- `desktop/` — Desktop (Svelte + Tauri + Rust). Located at `../resonance-logs/`.

## Frontend (recommended modules / patterns)

- Framework: Next.js (App Router) + React + TypeScript
- Styling: Tailwind / PostCSS (project already has `postcss.config.mjs`)
- UI primitives: Shadcn (shadcn UI components)
- Data fetching & caching: React Query (TanStack Query)
- HTTP client: Axios (for REST calls)
- Linting / formatting: ESLint + Prettier (see `app/eslint.config.mjs`)

When writing frontend code, prefer the App Router conventions (server and client components) and colocated `route.ts` API handlers where applicable.

## Backend (recommended modules / patterns)

- Language: Go
- HTTP framework: gin (lightweight web framework)
- ORM / DB: gorm
- Typical dev/build commands:
	- Build: `cd server; go build -o bin/server .`
	- Run: `cd server; go run ./main.go` or run the built binary `server\bin\server`

## Common developer commands

- Frontend (from repo root):
	- cd into frontend: `cd app`
	- Install deps: `npm install` (or `pnpm install` / `yarn` depending on repo preference)
	- Dev server: `npm run dev`
	- Build: `npm run build`

- Backend (from repo root):
	- Build: `cd server; go build -o bin/server .`
	- Run in dev: `cd server; go run ./main.go`

## CI / Local dev notes

- The backend produces a binary in `server/bin` by default in some scripts. Add `server/bin` to `.gitignore` if you don't want to check binaries in.
- Check `app/package.json` and `server/go.mod` for exact script names and module versions before running commands.

## Agent guidance

- Frontend automation or agents should use: React Query, Shadcn, Axios (these are the preferred libs in this repo).
- Backend automation or agents should use: gin, gorm.

If you want, I can also generate helpful scripts (PowerShell or bash) to automate common tasks, or add a short README in `server/` and `app/` with exact commands and environment-variable placeholders.

---
Updated: project overview and developer guidance.