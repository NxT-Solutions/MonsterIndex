# MonsterIndex Codebase

This folder contains the Laravel + Inertia React application for MonsterIndex.

## Architecture Notes

- Google OAuth-only auth (Socialite)
- Admin-only management for monsters, sites, monitors, and alerts
- Public best-price dashboard + monster detail history
- Hybrid extraction: HTTP parser first, then Playwright headless fallback
- DDD-style package modules under `app/Packages`

## Package-Oriented App Structure

- `app/Packages/Base` shared contracts/data objects
- `app/Packages/Bookmarklet` selector session + capture services
- `app/Packages/PriceExtraction` selector-based extractor services
- `app/Packages/Monitoring` monitor jobs + best-price projection services
- `app/Packages/*/.example` package template for new bounded contexts

## Local Runtime

Use the repo root Docker stack in `.docker/local`.

From repo root:

```bash
cp .docker/local/.env.example .docker/local/.env
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml up -d --build
```

Then initialize app dependencies:

```bash
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php composer install
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php php artisan key:generate
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php php artisan migrate
```

Hot reload is automatic via the persistent `node` service (Vite watch mode).

## OAuth Configuration

Set in `codebase/.env`:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

Admin emails are configured in `codebase/config/authz.php`.
