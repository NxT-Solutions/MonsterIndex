# Production Docker Setup

This folder contains the production image build and runtime stack for MonsterIndex.

## Files

- `compose.yaml`: runtime services for `monster-index`, `monster-index-queue`, and `monster-index-scheduler`
- `deploy.sh`: server-side rollout helper used by GitHub Actions
- `images/Dockerfile`: single production image build used by GitHub Actions
- `images/configs/app/entrypoint.sh`: runtime role switcher for web, queue, and scheduler containers
- `images/configs/app/post-deploy.sh`: Laravel deploy actions run after the new web container starts

## Runtime Model

- No server-side app `.env` file is required.
- GitHub Actions takes `codebase/.env.production`, injects GitHub secrets into it, and bakes the result into the image as `.env.production` and `.env`.
- The runtime stack joins the shared `web` and `internal` Docker networks so Caddy from the ops repo can reverse proxy `monster.cheapest.promo` to `monster-index:8080`.
- SQLite, queue state, sessions, and logs live in `.docker/production/storage` on the server.
