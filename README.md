# Nagrik Disha API

Node.js 22+, Express 5 and MySQL 8. The frontend is the sibling `nagrikdisha` project. No static fallback database is used.

## First setup

```bash
npm install
```

Create a new database and dedicated user using local MySQL administrator access:

```bash
sudo node scripts/provision.js
# If sudo created .env as root, transfer ownership to your current account:
sudo chown "$USER":"$(id -gn)" .env
npm run db:setup
npm run db:seed
npm run dev
```

If the root account requires a MySQL password rather than socket authentication, use `MYSQL_ADMIN_USER` / `MYSQL_ADMIN_PASSWORD` environment variables with `node scripts/provision.js`. Do not commit credentials. Alternatively copy `.env.example` to `.env`, configure an existing database user, then run setup and seed. The setup account needs permission to create the configured database and tables. Provisioning preserves existing accounts; it will stop if `.env` or the dedicated user already exists.

API runs at `http://127.0.0.1:4000`. `npm test` runs API behavior/validation tests against a stub repository; it does not verify a real MySQL connection.

The seed preserves the original reference groups, sectors and 16 helpline entries, without overwriting existing rows. No unverified scheme links are invented. Counts are computed from actual resource and helpline records, so newly seeded sectors initially show `0 LINKS`.

## Read endpoints

- `GET /api/health`: database readiness (503 when unavailable).
- `GET /api/catalog`: groups, sectors, group relations, categorized helplines, emergency banner entries and actual statistics.
- `GET /api/sectors/:id/resources`: resource links and details for a sector.

## Content management

`POST /api/admin/{type}`, `PUT /api/admin/{type}/{id}` (full replacement), `DELETE /api/admin/{type}/{id}`. Types: `groups`, `sectors`, `resources`, `helpline-sections`, `helplines`. Send `Authorization: Bearer <ADMIN_API_KEY>`. Configure a random key of at least 32 characters in `.env`; the key stays on the server and must never be placed in a frontend `VITE_*` environment variable. The frontend provides an authenticated admin dashboard at `/admin`.

Shared fields: `id` (lowercase slug), `sortOrder` (integer).

- groups: `name`, `description`, `icon`.
- sectors: `name`, `description`, `icon`, `color`, `action`, `keywords`, `groups` (group IDs).
- resources: `sectorId`, `name`, `description`, `eligibility`, `documents` (string array), `url`, `sourceUrl`, `lastVerified` (YYYY-MM-DD or null).
- helpline-sections: `title`.
- helplines: `sectionId`, `name`, `description`, `number`, `region`, `sourceUrl`, `lastVerified`, `emergencyLabel`, `emergencyOrder` (null hides entry from homepage banner).

Example resource body:

```json
{"id":"education-resource","sectorId":"education","name":"Official education resource","description":"Replace with verified details.","eligibility":"Add actual eligibility.","documents":[],"url":"https://example.gov.in","sourceUrl":null,"lastVerified":null,"sortOrder":0}
```

The example URL is a placeholder, not a verified resource. After an authenticated write, refresh the website to load the current database content. Deleting a sector/group/section cascades to its related records as defined in `scripts/schema.sql`.

Production: configure `FRONTEND_ORIGIN`, database credentials, host/port and a private admin key. Serve frontend and API over HTTPS, proxy `/api` to this service and configure frontend SPA route fallback. Stop processes cleanly before changing database configuration.

`FRONTEND_ORIGIN` is a comma-separated list of exact browser origins, including the port and without trailing slashes. Local defaults allow localhost and 127.0.0.1 on ports 5173 and 5174. If login says "Origin is not allowed", add the browser's origin to this list and restart the backend. For Render, update the service's environment variable and redeploy, preserving any existing production origins. Cross-site login from localhost directly to Render cannot retain the SameSite=Lax session cookie; use the local backend through Vite's `/api` proxy for local admin development.

## Admin login and dashboard

Run `npm run db:setup` to ensure the admins and sessions tables exist. Create your first admin locally (use your actual email):

```bash
read -rsp "Admin password (at least 12 characters): " ADMIN_PASSWORD
echo
export ADMIN_PASSWORD
npm run admin:create -- your-email@example.com
unset ADMIN_PASSWORD
```

Restart backend if it is running without watch mode. Open frontend `/admin/login`. Sessions last eight hours, are stored in MySQL and are revoked on logout. Passwords use salted scrypt hashes. Cookies are HttpOnly, SameSite=Lax, and Secure when `NODE_ENV=production`. Requests that change content require a session-specific CSRF token. Browser login is rate limited. Production must use HTTPS and preferably a same-origin `/api` reverse proxy; cross-site cookie login is not supported. There is no public signup or password-reset endpoint. Existing bearer-key API access remains available for server-side tooling.

New endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, protected `GET /api/admin/content`. The website dashboard manages all five entity types with typed forms and delete confirmation.
