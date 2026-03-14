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
- SQLite as the primary data store
- Docker-first local runtime in `.docker/local`
- Production deploy assets in `.docker/production`

## Repository Layout

- `codebase/` Laravel app
- `.docker/local/` local Docker stack
- `.docker/production/` production image build assets
- `.github/workflows/production-deploy.yml` production CI/CD pipeline

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

## Production Deploy (Hetzner + GitHub Actions + GHCR)

GitHub Actions workflow:
- `.github/workflows/production-deploy.yml`
- Trigger: pull requests build the image for validation, and pushes to `main` build, push, and deploy.
- Builds and pushes a single GHCR image for MonsterIndex.
- SSHes into the VPS and triggers the deploy from the ops repo runtime stack.

Required GitHub repository secrets:
- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_KEY`
- `APP_KEY`
- `GOOGLE_CLIENT_SECRET`
- `WEBPUSH_VAPID_PRIVATE_KEY`
- `GHCR_USERNAME`
- `GHCR_PAT`

Required GitHub repository variables:
- `OPS_REPO_DIR` (example: `/opt/OPS__MicroSaasFree`)
- `OPS_REPO_REF` (optional, defaults to `main`)
- `GOOGLE_CLIENT_ID`
- `WEBPUSH_VAPID_PUBLIC_KEY`

Runtime notes:
- No server-side application `.env` file is needed.
- The workflow bakes `codebase/.env.production` plus GitHub secrets into the image at build time.
- The runtime stack itself lives in the ops repo, where Caddy and the shared Docker networks are already managed.
