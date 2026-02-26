# Production Docker Setup

This folder contains the production runtime for deployment on a VPS.

## Files

- `compose.yaml`: runtime services (`app`, `queue`, `scheduler`, `web`, `redis`)
- `.env.example`: environment template for server-side secrets and image names
- `images/Dockerfile`: multi-target build (`app`, `web`) used by GitHub Actions

## Run on Server

```bash
cp .docker/production/.env.example .docker/production/.env
docker compose --env-file .docker/production/.env -f .docker/production/compose.yaml pull
docker compose --env-file .docker/production/.env -f .docker/production/compose.yaml up -d --remove-orphans
```

After startup:

```bash
docker compose --env-file .docker/production/.env -f .docker/production/compose.yaml exec -T app php artisan migrate --force
```
