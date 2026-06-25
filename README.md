# Insurance Quote API

A REST API for managing auto insurance quote applications. Supports incremental data collection with field-level validation, and deterministic quote calculation on submission.

## Tech Stack

- **TypeScript** — strict mode, ESNext modules
- **Fastify** — HTTP server and routing
- **Drizzle ORM** — typed SQL queries and migrations with `better-sqlite3`
- **Zod** — request validation and error formatting

## Getting Started

```bash
pnpm install
cp .env.example .env
pnpm dev   # runs on the port from .env (8000 in .env.example)
```

`pnpm dev` runs the server from source with hot reload. For a production run, build first: `pnpm build && pnpm start`.

SQLite runs in-memory by default. To persist data across restarts, set `DB_PATH` in `.env` to a file path.

## Running Tests

The server must be running before executing the test suite.

```bash
# terminal 1
pnpm dev

# terminal 2
pnpm test
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/applications` | Create a new application (accepts partial data) |
| `GET` | `/applications/:id` | Return application data; includes quote if valid, errors if not |
| `PATCH` | `/applications/:id` | Deep-merge update; blocked after submission |
| `DELETE` | `/applications/:id/data` | Remove a field by dot-path (e.g. `primaryDriver.dateOfBirth`) |
| `POST` | `/applications/:id/submit` | Validate, lock, and return the final quote |
| `DELETE` | `/applications/:id` | Delete an unsubmitted application |

## Key Design Decisions

- **Partial-data model** — missing fields are allowed while an application is being built; invalid values are always rejected at write time
- **Deterministic rating** — the same application data always produces the same quote
- **Submission lock** — once submitted, an application cannot be modified or deleted
- **Transactional writes** — multi-table operations roll back atomically on failure
- **Caller-keyed collections** — vehicles and additional drivers are maps keyed by client-supplied IDs, matching the API schema shape
