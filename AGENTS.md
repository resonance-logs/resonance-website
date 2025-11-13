<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Agents Guide — API Flow & Conventions

Purpose: This document describes the conventions and recommended workflow for adding and maintaining API endpoints in this repository. It is written for engineers and automated agents working across the backend Go server and the Next.js frontend. Follow these patterns to keep endpoints predictable, well-typed, and easy to consume from the frontend.

## Quick summary
- Backend routes are grouped and registered via `server/routes` -> `groups/*.go`.
- Controller logic lives under `server/controller/<feature>/` and returns typed response structs.
- Middleware populates context values (for example `db` and `current_user`) available to controllers via `c.Get("db")`.
- Frontend API helpers live in `app/src/api/<feature>/` and use a shared `api` Axios instance with TypeScript generics.
- Use React Query for data fetching in the frontend and keep types in sync between backend models and frontend `types`.

## Repo conventions
- Backend route group files: `server/routes/groups/<feature>.go` — name must match the registered group path.
- Controller folders: `server/controller/<feature>/...` — each feature should have a coherent folder.
- Frontend API helpers: `app/src/api/<feature>/<feature>.ts` — export request params, response types, and the request function.
- Shared types: place shared models in `app/src/types` (or `app/src/types/commonTypes`) and prefer reusing these across components.

## Routes & groups (backend)

Pattern: register route groups centrally then add group's routes in `groups/<feature>.go`.

Example: `server/routes/api.go`

```go
func RegisterAPIRoutes(router *gin.Engine) {
    rg := router.Group("/api/v1")

    groups.RegisterAuthRoutes(rg)
    groups.RegisterApiKeyRoutes(rg)
    groups.RegisterCombatRoutes(rg)
    groups.RegisterUploadRoutes(rg)
}
```

Example group file: `server/routes/groups/encounter.go`

```go
package groups

import (
    "github.com/gin-gonic/gin"
    cc "server/controller/encounter"
)

func RegisterEncounterRoutes(rg *gin.RouterGroup) {
    g := rg.Group("/encounter")
    g.GET("", cc.FetchEncounters)
    g.GET("/:id", cc.GetEncounter)
}
```

Rules:
- The file name and the registered group path should match the feature name.
- Keep grouping minimal and focused: one group per domain area (auth, encounter, upload, etc.).

## Controllers (backend)

Responsibilities:
- Parse and validate request params.
- Extract resources from Gin context (`db`, `current_user`, etc.).
- Perform DB operations using GORM.
- Return typed JSON responses or standardized errors.

Example controller handler: `server/controller/encounter/encounter.go`

```go
package encounter

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

type FetchEncountersResponse struct {
    Encounters []Encounter `json:"encounters"`
    Count      int         `json:"count"`
}

func FetchEncounters(c *gin.Context) {
    dbi, _ := c.Get("db")
    db := dbi.(*gorm.DB)

    // parse params, query DB, return
    var resp FetchEncountersResponse
    // ... fill resp
    c.JSON(http.StatusOK, resp)
}
```

Best practices:
- Define a `<FunctionName>Response` struct for every handler that returns structured JSON.
- Don’t return raw DB models directly — instead map to response DTOs when necessary.
- Use context values for shared resources. Always check presence and types when calling `c.Get("db")` or `c.Get("current_user")`.

## Response typing & error shape

Success responses should use explicit Go structs with `json` tags. Example: `FetchEncountersResponse` above.

Standard error response shape (recommended):

```json
{
  "error": {
    "code": "bad_request",
    "message": "detailed message",
    "fields": {"limit": "must be positive"}
  }
}
```

Server-side: return errors using `c.JSON(statusCode, ErrorResponse{...})` so frontend can consistently parse `error`.

## DB access in controllers

- DB is injected into the Gin context by middleware (see `server/middleware/middleware.go`). Use `dbi, ok := c.Get("db")` then `db := dbi.(*gorm.DB)`.
- Prefer using service/helper functions for complex DB operations so handlers stay thin.
- Use GORM best practices: pagination with `Limit/Offset`, `Preload` for relations, and careful use of transactions.

## Authentication & middleware

- Two common patterns exist: cookie-based JWT sessions and API-key based auth. Middleware populate `current_user` or `apikey` into context.
- Apply middleware selectively: protect routes that need a user, but keep some endpoints public for client-side discovery.

## Frontend API folder & function patterns

Location: `app/src/api/<feature>/` — one file per feature is preferred for small sets of endpoints.

Pattern for an endpoint file (`app/src/api/encounter/encounter.ts`):

```ts
export interface FetchEncountersParams { limit?: number; offset?: number; }
export interface FetchEncountersResponse { encounters: Encounter[]; count: number }

export async function fetchEncounters(params: FetchEncountersParams) {
  const { data } = await api.get<FetchEncountersResponse>('/encounter', { params })
  return data
}
```

Rules:
- Use the shared Axios `api` instance from `app/src/api/axios.ts`.
- Export both `Params` and `Response` types and the function that performs the request.
- Keep frontend response shapes consistent with backend response structs.

## Using types & React Query

- Keep shared types in `app/src/types`. When adding a new endpoint, update or add the interface there.
- Use React Query for data fetching and caching. Naming convention for query keys: `['<feature>', paramsOrId]`.

React Query example (in a component):

```tsx
const { data, isLoading } = useQuery(['encounters', params], () => fetchEncounters(params))
```

Mutation & cache invalidation:
- After POST/PUT/DELETE, call `queryClient.invalidateQueries(['<feature>'])` to refresh related queries.

## Validation & testing

- Validate request parameters at the controller boundary and return clear field errors in the error shape.
- Add unit tests for controller logic where possible and integration tests for end-to-end route behavior.
- For frontend, add tests for API helpers (mock `api`) and components that use React Query.

## Example: end-to-end (minimal)

1. Add controller: `server/controller/test/test.go` with `GetHello` returning `GetHelloResponse`.
2. Register group: `server/routes/groups/test.go` and call `g.GET("/hello", cc.GetHello)`.
3. Frontend: create `app/src/api/test/test.ts` exporting `getHello()` and `GetHelloResponse`.
4. Component: use `useQuery(['test-hello'], getHello)` to fetch data.

Code snippets (copy-ready):

Backend group registration (`server/routes/groups/test.go`):

```go
package groups

import (
    "github.com/gin-gonic/gin"
    cc "server/controller/test"
)

func RegisterTestRoutes(rg *gin.RouterGroup) {
    g := rg.Group("/test")
    g.GET("/hello", cc.GetHello)
}
```

Frontend API (`app/src/api/test/test.ts`):

```ts
export interface GetHelloResponse { message: string }
export async function getHello() {
  const { data } = await api.get<GetHelloResponse>('/test/hello')
  return data
}
```

## Checklist: Adding a new GET endpoint (quick reference)

1. Create controller handler in `server/controller/<feature>/` and define `<HandlerName>Response` struct.
2. Use `c.Get("db")` to obtain DB and `c.Get("current_user")` if needed; validate inputs.
3. Add route group file `server/routes/groups/<feature>.go` and register routes.
4. Add/update frontend types in `app/src/types` as needed.
5. Add frontend API helper in `app/src/api/<feature>/<feature>.ts` exporting params, response, and function.
6. Use React Query in components with `useQuery(['<feature>', params], () => fetchFeature(params))`.
7. Add tests (controller unit/integration + frontend helper tests) and update docs.
8. Smoke test with curl or browser and verify error and success shapes.

## Troubleshooting & common pitfalls

- Missing DB in context: verify middleware ordering and that `c.Set("db", db)` runs before route handlers.
- CORS / reverse-proxy: confirm `NEXT_PUBLIC_REVERSE_PROXY_URL` is set and Next.js dev proxy is configured.
- Type drift: when changing backend response structs, update frontend types immediately to avoid runtime mismatches.

## Appendix — reference snippets

- Shared axios instance: `app/src/api/axios.ts`

```ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REVERSE_PROXY_URL || 'http://localhost:3000/api',
  timeout: 10000,
  withCredentials: true,
})
export default api
```

- ErrorResponse example (server)

```go
type ErrorResponse struct {
    Error struct {
        Code    string                 `json:"code"`
        Message string                 `json:"message"`
        Fields  map[string]interface{} `json:"fields,omitempty"`
    } `json:"error"`
}
```