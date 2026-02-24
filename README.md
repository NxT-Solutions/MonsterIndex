# MonsterIndex

MonsterIndex is an open-source community platform for tracking Monster Energy deals.

The core model is public:
- Everyone can browse best offers and price history without login.
- Logged-in contributors can submit monitor proposals for existing monsters.
- Admin moderators approve/reject proposals and monster suggestions.
- Only approved monitors affect public rankings and scheduled scraping.

## Stack

- Laravel 12 + Inertia React + shadcn/ui
- Google OAuth only
- Spatie Roles/Permissions v7
- SQLite (primary DB profile) + Redis (queue/cache/session/rate-limit)
- Docker-first local runtime in `.docker/local`

## Repository Layout

- `/Users/codana/lokal.host/projects/MonsterIndex/codebase` Laravel app
- `/Users/codana/lokal.host/projects/MonsterIndex/.docker/local` local Docker stack

## Quick Start (Docker)

1. Prepare Docker env:
```bash
cp .docker/local/.env.example .docker/local/.env
```

2. Start services:
```bash
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml up -d --build
```

3. Install and bootstrap:
```bash
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php composer install
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php cp .env.example .env
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php php artisan key:generate
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php php artisan migrate
```

4. Open:
- App: `http://localhost:8888` (or your `APP_EXPOSED_PORT`)
- Vite HMR server: `http://localhost:5151` (assets only)

5. Confirm HMR watcher:
```bash
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml logs -f node
```

## Local Helper Aliases

```bash
source .docker/local/aliases.sh
```

Available:
- `dup` start/build stack
- `ddown` stop stack
- `dlogs` tail logs
- `dartisan` run artisan inside php container
- `dcomposer` run composer inside php container
- `dbun` run bun inside node container
- `devite` tail Vite container logs
