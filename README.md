# MonsterIndex

MonsterIndex uses a mono-repo style layout:

- `codebase/` contains the Laravel + Inertia application
- `.docker/local/` contains the local Docker runtime stack

## Quick Start (Docker)

1. Create Docker env file:

```bash
cp .docker/local/.env.example .docker/local/.env
```

2. Start the stack:

```bash
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml up -d --build
```

3. Install dependencies and bootstrap app:

```bash
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php composer install
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml run --rm node npm install
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php php artisan key:generate
docker compose --env-file .docker/local/.env -f .docker/local/compose.yaml exec php php artisan migrate
```

4. Open the app at `http://localhost:8080` (or your configured `APP_EXPOSED_PORT`).

## Optional shell helpers

```bash
source .docker/local/aliases.sh
```

Available helpers: `dup`, `ddown`, `dlogs`, `dartisan`, `dcomposer`, `dnpm`, `devite`.
