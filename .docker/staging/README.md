# Staging Docker Setup

This folder contains the staging runtime for deployment on a VPS.

## Files

- `compose.yaml`: runtime services (`app`, `queue`, `scheduler`, `web`, `redis`)
- `.env.example`: environment template for server-side secrets and image names
- `images/Dockerfile`: multi-target build (`app`, `web`) used by GitHub Actions

## Run on Server

```bash
cp .docker/staging/.env.example .docker/staging/.env
docker compose --env-file .docker/staging/.env -f .docker/staging/compose.yaml pull
docker compose --env-file .docker/staging/.env -f .docker/staging/compose.yaml up -d --remove-orphans
```

After startup:

```bash
docker compose --env-file .docker/staging/.env -f .docker/staging/compose.yaml exec -T app php artisan migrate --force
```
