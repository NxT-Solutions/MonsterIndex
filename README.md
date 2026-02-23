# MonsterIndex

MonsterIndex is a Laravel + Inertia React app for tracking Monster Energy prices across multiple stores.

## Current MVP baseline

- Google OAuth only authentication (Laravel Socialite)
- No password, reset, registration, or email verification flows
- Admin role enforced by hardcoded email allowlist in `config/authz.php`
- Public landing page + authenticated dashboard + admin-only dashboard
- Inertia React UI with shadcn-style components

## Stack

- Laravel 12
- Inertia.js + React + TypeScript
- Tailwind CSS
- Socialite (Google OAuth)

## Local setup

1. Install dependencies:

```bash
composer install
npm install
```

2. Configure env:

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

4. Configure admin emails in `config/authz.php`.

5. Run migrations:

```bash
php artisan migrate
```

6. Run app:

```bash
composer run dev
```

## Auth routes

- `GET /login`
- `GET /auth/google/redirect`
- `GET /auth/google/callback`
- `POST /logout`
