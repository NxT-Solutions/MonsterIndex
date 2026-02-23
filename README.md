# MonsterIndex

MonsterIndex is an open-source Laravel + Inertia React SaaS for tracking Monster Energy prices across multiple stores.

## MVP Features

- Google OAuth-only authentication (no password or reset flows)
- Admin-only management for:
  - monsters
  - sites/domains
  - monitors
  - alerts
- Public best-price board (`/`)
- Public monster price history (`/monsters/{slug}`)
- Hybrid extraction pipeline:
  - HTTP parsing first
  - headless fallback via Playwright script
- Interactive bookmarklet selector flow:
  - create selector session
  - click price/shipping elements on external product pages
  - capture and validate selectors
- Scheduled due-monitor dispatch + queued monitor checks
- Snapshot history + best-price projection + in-app alerts

## Stack

- Laravel 12
- Inertia.js + React + TypeScript
- Tailwind + shadcn-style UI components
- Queue + scheduler jobs
- Socialite (Google OAuth)

## Routes

### Public

- `GET /` best price board
- `GET /monsters/{slug}` monster details + snapshots
- `GET /api/public/best-prices` JSON feed

### Auth

- `GET /login`
- `GET /auth/google/redirect`
- `GET /auth/google/callback`
- `POST /logout`

### Admin

- `GET /admin`
- `GET /admin/monsters`
- `GET /admin/sites`
- `GET /admin/monitors`
- `GET /admin/alerts`

### Bookmarklet / Monitor APIs

- `POST /api/bookmarklet/session` (admin)
- `GET|POST /api/bookmarklet/capture` (token)
- `POST /api/admin/monitors/{monitor}/run-now` (admin)
- `GET /bookmarklet/selector.js?token=...`

## Local Setup

1. Install dependencies:

```bash
composer install
npm install
```

2. Configure environment:

```bash
cp .env.example .env
php artisan key:generate
```

3. Set Google OAuth credentials in `.env`:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

4. Configure admin email allowlist in `config/authz.php`.

5. Run migrations and seed data:

```bash
php artisan migrate --seed
```

6. Run app + worker + Vite:

```bash
composer run dev
```

## Scheduler / Worker (production)

Run scheduler every minute:

```bash
* * * * * cd /path/to/MonsterIndex && php artisan schedule:run >> /dev/null 2>&1
```

Run queue worker:

```bash
php artisan queue:work --tries=3
```

## Headless Fallback

The fallback script is at `scripts/extract-playwright.mjs`.

Install Playwright if you want live fallback extraction:

```bash
npm install --save-dev playwright
```

## Tests

```bash
php artisan test
npm run build
```
