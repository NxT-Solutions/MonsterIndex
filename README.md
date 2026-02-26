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
- `dphp` run arbitrary commands in php container
- `dvapid` generate `WEBPUSH_VAPID_PUBLIC_KEY` and `WEBPUSH_VAPID_PRIVATE_KEY`
- `devite` tail Vite container logs

## Staging Deploy (Hetzner + GitHub Actions + GHCR)

The staging deployment files live in `/Users/codana/lokal.host/projects/MonsterIndex/.docker/staging`.

GitHub Actions workflow:
- Builds two images from `.docker/staging/images/Dockerfile`:
- `app` target: `ghcr.io/<owner>/monsterindex-app:staging`
- `web` target: `ghcr.io/<owner>/monsterindex-web:staging`
- Deploys to your VPS over SSH and runs `docker compose pull && up -d`.

Required GitHub repository secrets:
- `STAGING_HOST` VPS hostname or IP
- `STAGING_USER` SSH user
- `STAGING_SSH_KEY` private key for SSH auth
- `STAGING_PORT` SSH port (optional, defaults to `22`)
- `STAGING_PATH` deploy path on VPS (example: `/opt/monsterindex`)
- `GHCR_USERNAME` GitHub username for container pull auth
- `GHCR_TOKEN` GitHub token/PAT with `read:packages`

First-time VPS bootstrap:
```bash
mkdir -p /opt/monsterindex/.docker/staging
cp /opt/monsterindex/.docker/staging/.env.example /opt/monsterindex/.docker/staging/.env
```

Then fill `/opt/monsterindex/.docker/staging/.env` with your real values (`APP_KEY`, OAuth keys, web push keys, `APP_URL`, etc.).

Yes: you can use GitHub Container Registry (`ghcr.io`) instead of Docker Hub.

## Production Deploy (Hetzner + GitHub Actions + GHCR)

The production deployment files live in `/Users/codana/lokal.host/projects/MonsterIndex/.docker/production`.

GitHub Actions workflow:
- `.github/workflows/production-deploy.yml`
- Trigger: push a git tag matching `v*` (example: `v1.0.0`) or run it manually with `workflow_dispatch`.
- Builds and pushes:
- `ghcr.io/<owner>/monsterindex-app:production`
- `ghcr.io/<owner>/monsterindex-web:production`
- Deploys to your production VPS over SSH.

Required GitHub repository secrets:
- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_PORT` (optional, defaults to `22`)
- `PRODUCTION_PATH` (example: `/opt/monsterindex`)
- `GHCR_USERNAME`
- `GHCR_TOKEN` (`read:packages` for pull on server, `write:packages` for push from Actions if not using `GITHUB_TOKEN`)

First-time VPS bootstrap:
```bash
mkdir -p /opt/monsterindex/.docker/production
cp /opt/monsterindex/.docker/production/.env.example /opt/monsterindex/.docker/production/.env
```
