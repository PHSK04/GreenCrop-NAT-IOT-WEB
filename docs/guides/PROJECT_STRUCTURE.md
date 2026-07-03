# Project Structure

## Root

Keep only entrypoint and tool configuration files here:

- `package.json`, `package-lock.json`
- `index.html`, `vite.config.ts`, `tailwind.config.js`, TypeScript configs
- `docker-compose.*.yml`
- `render.yaml`
- `README.md`

## Frontend

- `src/components/` - shared UI and app shell components
- `src/components/pages/` - general dashboard pages
- `src/features/` - domain features grouped by responsibility
- `src/features/ai/` - AI pages and analysis services
- `src/features/auth/` - authentication
- `src/features/chat/` - NAT AI chat and support chat
- `src/contexts/` - app-wide React contexts
- `src/hooks/` - reusable hooks
- `src/utils/` - small shared utilities

## Backend

- `server/server.js` - Express API entrypoint
- `server/database*.js` - database adapters and schema bootstrap
- `server/mqtt_listener.js` - MQTT ingestion
- `server/services/` - backend domain services such as AI training sample capture
- `server/middleware/` - Express middleware
- `server/migrations/` - SQL migration files

## AI / ML

- `ai/README.md` - AI pipeline notes
- `ai/requirements.txt` - Python ML dependencies
- `ai/training/` - Python training scripts
- `ai/exports/` - local/private exported samples, ignored by git
- `ai/models/` - local/private trained model output, ignored by git

## Docs

- `docs/guides/` - setup and developer guides
- `docs/operations/` - deployment and operations
- `docs/reference/` - reference material such as API docs
- `docs/notes/` - working notes and historical summaries

## Rule Of Thumb

If a file is needed by the build tool directly, keep it at the root. If it is explanation, move it under `docs/`. If it is feature code, keep it under the matching `src/features/*` or `server/services/*` area.
