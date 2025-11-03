# PLAN: FFLogs-like API for resonance-website

Date: 2025-11-02
Author: Planning assistant

This document describes an implementation plan to build an FFLogs-like API for the resonance-website project.
It is written with the existing project structure and `resonance-logs` client in mind. The backend uses Go (gin) and Appwrite (per AGENTS.md). The frontend is Next.js (app/), and a desktop client (`resonance-logs/`) is available (Svelte + Tauri) which will be the primary uploader.

Goals
- Provide a scalable REST API (v1) that accepts raw combat logs from the `resonance-logs` client, parses them into structured fight and player metrics, and exposes endpoints for reports, fights, player parses, and leaderboards.
- Keep the system modular: clear separation between ingestion (uploads), processing (parsing + enrichment), storage (raw and parsed), and query APIs.
- Support programmatic uploads via API keys (for automated uploads) and authenticated user uploads (via JWT/session).
- Provide observability, reprocessing, and admin tools for data correction.

Non-goals (initial)
- Full feature parity with FFLogs (we will implement a core MVP capable of ingesting logs, producing fight-level aggregates, player parses, and leaderboards).
- Real-time waveform/timeline streaming for the first release.

High-level architecture

Client(s)
- `resonance-logs` (Svelte/Tauri desktop client) — primary uploader.
- Web UI (`app/` Next.js) — report browsing, leaderboards, admin.
- Third-party clients — use API keys.

Server
- HTTP API (gin) — endpoints under `/api/v1/...` implemented in `server/routes/*` and `server/controller/*`.
- Storage — Appwrite (documents & storage) OR S3 for raw files + Appwrite/Postgres for metadata (decision point: Appwrite storage is simplest; S3 recommended for scale).
- Queue — Redis (recommended) / Appwrite functions (alternate). Worker processes consume jobs and run parsing & enrichment.
- Worker — `server/worker` (daemon) or separate microservice that downloads raw logs, parses, stores processed documents.

Data model (collections/documents)

Use Appwrite collections (or a relational DB where appropriate). Suggested collections and key fields:

1) uploads (raw upload metadata)
- id (string)
- uploader_user_id (string|null)
- api_key_id (string|null)
- filename (string)
- storage_path (string) — Appwrite file ID or S3 key
- size (int)
- sha256 (string) — file dedupe fingerprint
- status (string) — queued | processing | processed | failed | cancelled
- error (string|null)
- created_at, updated_at
- parsed_report_id (string|null) — link to report once parsed

2) reports (a parsed log file => possibly contains many fights)
- id
- upload_id
- zone (string) — boss or zone name
- started_at, ended_at
- fights_count
- fights: []fight_id
- metadata (JSON) — parser version, tags
- created_at, updated_at

3) fights
- id
- report_id
- boss_id / encounter_id
- start_time, end_time
- duration_seconds
- difficulty
- wipe (bool)
- players: array of player summaries
- aggregates: damage, healing, deaths, etc. (precomputed)
- created_at

4) player_parses (per-fight per-player summary)
- id
- fight_id
- player_id
- job/spec
- damage_done, damage_taken, healing_done, death_count
- timeline (optional compressed data)

5) players (canonical player record)
- id (generated or derived from stable keys like name+server)
- name
- server
- aliases
- class/spec history

6) api_keys
- id
- user_id
- label
- hashed_key
- scopes (upload, read, admin)
- rate_limit (requests per minute)
- quota (bytes/day)
- created_at

7) jobs / processing_logs (optional)
- job_id
- upload_id
- worker_id
- steps (parse, enrich, store) with timings
- logs (for debugging)

Mapping to repository
- Add/extend `server/models/`:
  - `upload.go`, `report.go` (exists), `fight.go`, `player.go`, `parse.go`, `apikey.go`, `job.go`.
- Add controllers:
  - `server/controller/upload/upload.go`
  - `server/controller/reports/*.go`
  - `server/controller/admin/*.go`
  - `server/controller/keys/*.go`
- Add routes:
  - `server/routes/upload.go` (register upload endpoints)
  - `server/routes/reports.go`
  - `server/routes/leaderboards.go`
  - `server/routes/admin.go`
- Worker code:
  - `server/worker/worker.go` (background process that consumes queue)
  - `server/processor/parser.go` (parsing logic and aggregator)

API endpoints (v1)

Auth:
- JWT-based user session for web UI
- API keys (header `x-api-key`) for programmatic uploads

Public endpoints (unauthenticated where applicable):
- GET /api/v1/health — basic health

Upload & ingestion
- POST /api/v1/uploads — (auth optional) Initiate an upload. Body: {filename, size, sha256?, metadata?}. Response: {upload_id, upload_url, upload_policy}.
  - If using Appwrite storage or server-proxy upload, server returns `upload_id` and either a presigned URL or an upload token.
- POST /api/v1/uploads/:id/commit — commit an upload (server verifies storage and enqueues processing). Request: {storage_id or file_id}. Response: {status: queued}
- GET /api/v1/uploads/:id/status — {status, error, parsed_report_id}

Query/Reports
- GET /api/v1/reports?page=&limit=&zone=&from=&to= — paginated list of reports
- GET /api/v1/reports/:report_id — report metadata (list of fight ids)
- GET /api/v1/reports/:report_id/fights — list fights with aggregates
- GET /api/v1/fights/:fight_id — detailed fight data (players, timeline summary)
- GET /api/v1/fights/:fight_id/parses — per-player parses for the fight
- GET /api/v1/players/:player_id/parses?page=&limit=&sort= — list of parses for a player
- GET /api/v1/leaderboards?boss=&metric=dps&spec=&season=&limit=&page= — leaderboard aggregation

Admin endpoints (protected)
- POST /api/v1/admin/reprocess/:upload_id — re-enqueue parsing
- POST /api/v1/admin/delete-report/:report_id — remove a report and optionally raw file
- GET /api/v1/admin/jobs — list background jobs and statuses
- API key management: POST/GET/DELETE /api/v1/keys

Detailed upload flow (recommended)

Option A — Appwrite Storage (simple)
1. Client POST /api/v1/uploads with metadata.
2. Server creates `uploads` doc with status `created` and responds with a short-lived Appwrite file upload token or a small presigned upload url.
3. Client uploads the file to Appwrite Storage directly.
4. Client calls POST /api/v1/uploads/:id/commit with the Appwrite file id.
5. Server verifies checksum/size, updates `uploads` to `queued`, and enqueues a job in Redis with upload_id and storage ref.
6. Worker downloads file from Appwrite, parses, stores parsed documents to Appwrite DB, links `report_id` to upload.

Option B — S3/Presigned (recommended for scale)
- Same steps but use S3 presigned POST / multipart. Use S3 for raw files and Appwrite/Postgres for metadata.

Chunked/resumable support
- For large logs, support multipart or chunked uploads. Offer a session id and endpoint to append chunks.
- Use a simple resumable protocol (client uploads chunks to storage, server assembles or uses S3 multipart).

Processing pipeline

1. Dequeue job (upload_id, storage reference).
2. Download file (streaming) and compute fingerprint (sha256) for dedupe.
   - If file hash matches an existing parsed upload, mark as deduped and link parsed_report_id.
3. Parse events (implement robust parser in `server/processor`):
   - Use event-driven parsing to detect fights, boundaries, participants, ability events, and resource changes.
   - Tolerate different versions/formats; store parser version and warnings.
4. Group events into fights and compute per-fight aggregates and per-player parses.
5. Enrich with canonical player IDs (resolve aliases/servers).
6. Persist `reports`, `fights`, `player_parses` and update `uploads` state to `processed`.
7. Trigger cache invalidation for leaderboards and search indexes.

Parser considerations
- If an open-source parser exists for the game's log format, prefer reusing it. Otherwise, implement a streaming parser that maps each line/event to a typed record.
- Keep parser deterministic and versioned.
- Provide a debug mode to output parse traces for failing logs.

Deduplication & canonicalization
- Deduplicate by file hash (sha256). Also do fuzzy dedupe for similar timestamps/players if needed.
- Maintain player canonicalization table (name+server -> canonical id). Allow manual merges in the admin UI.

Aggregation & leaderboards
- Compute per-fight aggregates on ingest and persist them.
- For leaderboards, either compute on-demand (slow) OR maintain precomputed leaderboard documents updated by a worker.
- Cache leaderboards in Redis and invalidate on new relevant parses.

Indexing & performance
- Ensure fields used by filters (boss_id, spec, metric, player_id, timestamps) are indexed in Appwrite or DB.
- Use pagination for large lists; prefer cursor pagination for large datasets.

Authentication, rate-limiting & quotas
- API keys: issue hashed API keys with scopes and quotas. Enforce daily upload quotas and per-second rate-limits.
- User auth: use JWT session for the web UI. Use `server/routes/auth.go` to manage sessions.
- Rate limit endpoints per IP and per API key (Redis-based token bucket).

Security
- Validate file types and sizes on the server before accepting.
- Scan for malicious content if files can contain embedded scripts.
- Store API keys hashed (bcrypt or HMAC) and never return raw keys after creation.
- CORS: restrict to web app origins and the resonance-logs uploader if applicable.

Observability & monitoring
- Emit metrics: ingestion rate, parse success/failure, average parse time, queue length. Export Prometheus metrics from the worker and API.
- Structured logs (JSON) with request IDs.
- Alerting for worker crashes or long queue lengths.

Testing & QA
- Unit tests for parser, aggregate functions, and controllers.
- Integration tests: small test harness to upload sample logs and assert resulting `reports`/`fights`/`player_parses`.
- E2E: from `resonance-logs` upload to processed report and frontend rendering.
- Add test data fixtures (small logs) under `server/testdata/`.

Frontend integration (Next.js)
- Add pages/components in `app/src/`:
  - Upload page: `app/src/app/upload/page.tsx` (client component) — uses Axios + React Query to call upload endpoints and show status.
  - Reports list: `app/src/app/reports/page.tsx`.
  - Report detail/fight view: `app/src/app/reports/[id]/page.tsx`.
  - Leaderboards: `app/src/app/leaderboards/page.tsx`.
  - Admin: API key and reprocess UI: `app/src/app/admin/*` (protected).
- Use React Query for caching + optimistic updates.
- Use the project’s existing UI primitives in `app/src/components/ui/`.
- Ensure web UI uses `/api/` reverse proxy (per AGENTS.md) for backend requests.

`resonance-logs` (Svelte/Tauri) integration
- Provide a small uploader library inside `resonance-logs/`:
  - `resonance-logs/src/lib/uploader.ts` (or `.js`) — implements:
    1. Request upload token: POST /api/v1/uploads {filename,size,sha256}
    2. Upload file to provided upload URL (Appwrite/S3) or stream through server proxy.
    3. Call commit endpoint to start processing.
    4. Poll `GET /api/v1/uploads/:id/status` until `processed`.
    5. Emit events back to UI: progress, complete, error.
- Support background uploads via Tauri native file access. Consider resumable/chunked uploads for large logs.
- CLI / automated upload support: `resonance-logs` should be able to run an uploader CLI or background daemon using an API key.

Operational concerns
- Backups for raw files and parsed DB.
- Retention policies: option to automatically delete raw files after X days, or keep forever for reprocessing.
- Cost: S3 storage + compute for workers. Estimate costs for expected ingestion volume.

Open questions & decision points
- Storage: Appwrite Storage vs S3 (S3 preferred for scale and cost predictability).
- Queue: Redis vs Appwrite Functions. Redis + go-redis is recommended for reliability and tooling.
- DB: continue with Appwrite documents or introduce Postgres for heavy analytics. If we expect large-scale aggregates (leaderboards), Postgres is recommended.
- Parser reuse: is there a known open-source parser for the specific log-format? If yes, reuse.

Milestones & timeline (example)
- Week 0: Design & schema (this document). Implement data models in `server/models/` and route scaffolding.
- Week 1: MVP upload flow (POST upload + commit), worker stub that marks uploads as processed (no parse yet), and front-end upload page.
- Week 2: Implement parser and basic processing (fight detection, simple aggregates). Wire to frontend report list and detail view.
- Week 3: Add player canonicalization, leaderboards, caching, and admin UI (reprocess & api key management).
- Week 4+: Hardening, scale testing, monitoring, and polish.

Acceptance criteria (MVP)
- A `resonance-logs` client can upload a combat log and receive a final `report_id` after processing.
- The server stores raw upload metadata and parsed `reports` and `fights` documents.
- The web UI can list reports and show individual fight aggregates and player parses.
- Admin can reprocess a failed upload.

Next steps (short)
1. Create the `uploads` Appwrite collection and add server models `upload.go`.
2. Implement `POST /api/v1/uploads` and `POST /api/v1/uploads/:id/commit` to accept uploads and enqueue processing.
3. Add a lightweight worker that consumes a Redis queue and changes upload status to `processed` (stub) so the front-end flow can be tested end-to-end.
4. Integrate a simple uploader in `resonance-logs` to exercise the flow.

Repository-level TODO mapping (quick)
- `server/models/*` — add upload/fight/parse models.
- `server/routes/upload.go` + `server/controller/upload/` — implement upload API.
- `server/worker/` `server/processor/` — parsing pipeline.
- `app/src/app/upload/` — client upload UI.
- `resonance-logs/src/lib/uploader.*` — desktop uploader.

Contact & ownership
- Backend owner: someone familiar with `server/` (Go/gin) and Appwrite integration.
- Frontend owner: someone familiar with `app/` (Next.js + React/TS).
- `resonance-logs` owner: desktop/Tauri maintainer for integration.

Appendix: Environment variables (examples)
- APPWRITE_ENDPOINT
- APPWRITE_PROJECT
- APPWRITE_KEY
- STORAGE_BACKEND = "appwrite" | "s3"
- S3_BUCKET
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- REDIS_URL
- JWT_SECRET
- UPLOAD_MAX_SIZE
- RATE_LIMIT_DEFAULT


---
