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

Make sure to use the /api/ reverse proxy when making api requests to the backend!!! (IMPORTANT)
We want to make sure that our frontend is optimized for 1400px and below, we should build our pages to justify center and leave empty space on the left and right of the page if screens are larger than 1400px.

Make sure to adjust components for smaller than 1400px.

## Backend (recommended modules / patterns)

- Language: Go
- HTTP framework: gin (lightweight web framework)
- ORM / DB: gorm
- Typical dev/build commands:
	- Run: `cd server; go run ./main.go` use this to test run the server if needed.

## Backend project layout suggestion (models / routes / controllers)

Recommended structure for the Go backend that follows the convention you described — one file per schema in `models`, grouped route files under `routes/`, and a parallel `controller/` directory with business logic — is fully workable and idiomatic in Go when done with clear package boundaries.

Suggested layout (inside `server/`):

- `server/models/` — one file per schema (e.g. `user.go`, `upload.go`, `post.go`). Each file defines the struct(s) and related DB helper methods (e.g. receiver methods for queries). Keep this package focused on data shapes and persistence helpers.
- `server/routes/` — subfolders for app sections (e.g. `routes/users/`, `routes/upload/`). Each subfolder contains small files that only register HTTP routes (handlers) and adapt request/response details. These files should be thin and delegate to the `controller` package.
- `server/controller/` — mirror the `routes` subfolders (`controller/users/`, `controller/upload/`). Controllers contain the business logic and call `models` for persistence. This keeps your handlers tiny and makes the core logic easy to test.

How to organize packages and responsibilities:

- Package `models`: define DB models (struct tags for GORM), migrations, and helper methods that directly interact with the DB. Keep no HTTP or gin types here.
- Package `controller`: implement functions that perform application logic. Controllers receive plain Go types (or `context.Context`) and return results or typed errors. They should depend on `models` but not on `routes` or gin.
- Package `routes`: create gin handlers that parse/validate HTTP input, call the corresponding `controller` functions, and write JSON responses. Handlers adapt between HTTP and controller types.

Implementation tips:

- Use package-level names consistent with directories (e.g., `package models`, `package controller`, `package routes`). Inside `routes` subfolders you can use `package routes` or `package users` depending on taste; keeping `package routes` and using descriptive filenames is common.
- Keep controller functions small and return well-defined errors (wrap with sentinel or typed errors) so HTTP handlers can map them to status codes.
- Use dependency injection where helpful (e.g., pass a `*gorm.DB` or repository interface into controller constructors) to make testing easier.

This update has been added here so agents and contributors follow the recommended pattern when modifying the backend.

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