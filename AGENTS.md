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

## Backend (recommended modules / patterns)

- Language: Go
- HTTP framework: gin (lightweight web framework)
- DB access: Appwrite SDK (github.com/appwrite/sdk-for-go) via the helpers in `server/database/appwrite.go`
- Typical dev/build commands:
	- Run: `cd server; go run ./main.go` use this to test run the server if needed.

## Backend project layout suggestion (models / routes / controllers)

Recommended structure for the Go backend that follows the convention you described — one file per schema in `models`, grouped route files under `routes/`, and a parallel `controller/` directory with business logic — is fully workable and idiomatic in Go when done with clear package boundaries.

Suggested layout (inside `server/`):

- `server/database/appwrite.go` — centralizes Appwrite client/databases initialization and loads collection IDs from environment variables. Import this package to obtain the shared `*databases.Databases` instance and `database.Collections` identifiers.
- `server/database/appwrite.go` — centralizes Appwrite client/databases initialization. At startup it attempts to discover collection IDs automatically from the Appwrite project; if discovery is not available it falls back to environment variables or sensible defaults. Import this package to obtain the shared `*databases.Databases` instance and `database.Collections` identifiers.
- `server/models/` — Go structs that model Appwrite documents and DTOs. Keep JSON tags for API responses, but avoid GORM-specific tags; these structs should remain transport/data only.
- `server/routes/` — subfolders for app sections (e.g. `routes/users/`, `routes/upload/`). Each subfolder should only register HTTP routes (handlers) and adapt request/response details. These files stay thin and delegate to the `controller` package.
- `server/controller/` — mirror the `routes` subfolders (`controller/users/`, `controller/upload/`). Controllers contain the business logic and call helper functions that use the Appwrite SDK for persistence.

How to organize packages and responsibilities:

- Package `database`: exposes helpers (`GetDatabases`, `GetDatabaseID`, `Collections`) for interacting with Appwrite. Access environment variables through `database.GetEnv` and keep initialization within `main.go`.
- Package `database`: exposes helpers (`GetDatabases`, `GetDatabaseID`, `Collections`) for interacting with Appwrite. It attempts runtime discovery of collection IDs and uses environment variables for collection overrides/fallbacks. Access other environment variables through `database.GetEnv` and keep initialization within `main.go`.
- Package `models`: define shared DTOs for requests/responses. Keep them framework-neutral so they can be marshaled to/from Appwrite documents without additional annotations.
- Package `controller`: implement functions that perform application logic. Controllers should obtain the Appwrite databases client from `database.GetDatabases()`, use `database.Collections` to target the correct collection IDs, and translate between models and HTTP responses.
- Package `routes`: create gin handlers that parse/validate HTTP input, call the corresponding `controller` functions, and write JSON responses. Handlers adapt between HTTP and controller types.

Implementation tips:

- Use package-level names consistent with directories (e.g., `package models`, `package controller`, `package routes`). Inside `routes` subfolders you can use `package routes` or `package users` depending on taste; keeping `package routes` and using descriptive filenames is common.
- Keep controller functions small and return well-defined errors (wrap with sentinel or typed errors) so HTTP handlers can map them to status codes.
- When a controller needs data access, grab the shared Appwrite client via `db := database.GetDatabases()` and use the collection IDs from `database.Collections`. Wrap Appwrite SDK calls in small helper functions so they remain testable.

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
- Backend automation or agents should use: gin, Appwrite SDK (github.com/appwrite/sdk-for-go).

If you want, I can also generate helpful scripts (PowerShell or bash) to automate common tasks, or add a short README in `server/` and `app/` with exact commands and environment-variable placeholders.

---
Updated: project overview and developer guidance.