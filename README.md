# MiniLedger

MiniLedger is a mobile-first personal lending tracker built with Expo / React Native, an Express + TypeScript API, Prisma, and MySQL 8.4. The interface uses a warm ivory canvas, deep green finance cards, compact ledger rows, and distinct overdue cues.

## Prerequisites

- Node.js 20 or later
- npm
- Docker Desktop or Docker Engine with Compose
- Expo Go or an iOS/Android simulator for the mobile app

## Start MySQL

```sh
cp .env.example .env
docker compose up -d
docker compose ps
```

MySQL is available at `localhost:3306`. The local development database is named `miniledger`. Replace the sample passwords in `.env` before exposing the service outside your machine. The volume persists across restarts. Prisma migrations create and update the application tables. Remove all local database data with `docker compose down -v`.

## Start the API

```sh
cp apps/api/.env.example apps/api/.env
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

API base URL: `http://localhost:4000`. Health check: `GET /health`. Swagger UI: `http://localhost:4000/api/docs`.

Optional development sample records (owned by `+919999000001`):

```sh
NODE_ENV=development npm run db:seed
```

The seed has overdue, upcoming, partially repaid, and settled examples. It clears and recreates only that demo user's loans. The seed script refuses to run unless `NODE_ENV=development`.

## Start the mobile app

```sh
cd apps/mobile
npm install
cp .env.example .env
npm run start
```

The default API address works for iOS simulator and web on the same machine. For Android emulator set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`; for a physical device use your computer's LAN IP address. Restart Expo after changing `.env`.

To preview in a desktop browser, start the API and run `EXPO_PUBLIC_API_URL=http://localhost:4000 npm run web` from `apps/mobile`. Native iOS and Android keep access tokens in SecureStore; the browser preview uses localStorage.

### See the development OTP

1. Start the API with `cd apps/api && npm run dev` and leave that terminal open.
2. In the app, enter an Indian mobile number and tap **Send verification code**. For the seeded demo account, use **+91 99990 00001** (enter `9999000001` in the app).
3. Read the line printed in the API terminal, for example: `[MiniLedger dev OTP] +919999000001: 123456`.
4. Enter that six-digit code on the verification screen. It expires after five minutes; request another if it expires.

The code is intentionally printed only by the development API and is never returned in the HTTP response. OTPs are hashed in MySQL and limited to five verification attempts. This mock OTP flow is strictly for local development; production requires an SMS provider and stronger session lifecycle controls. Native app access tokens use SecureStore; the browser preview uses localStorage.

## Included workflows

- Phone-number OTP request and verification, hashed OTP challenges, expiry, attempt caps, and request throttling.
- JWT-protected routes with user-scoped loan reads and writes.
- Create, view, update, and guarded delete of loans.
- Partial and final repayments with transaction-level row locking and overpayment checks.
- Financial summary with total lent, repaid, outstanding, overdue amounts, and loan counts.
- Expo dashboard, loan search/status filters, loan detail/history, and add-loan/repayment forms.
- Versioned Prisma/MySQL migration for users, OTP challenges, refresh-token records, loans, repayments, and receipt metadata.

API endpoints:

- `POST /api/v1/auth/request-otp`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/logout`
- `GET /api/v1/summary`
- `GET|POST /api/v1/loans`
- `GET|PATCH|DELETE /api/v1/loans/:id`
- `GET|POST /api/v1/loans/:id/repayments`

Run the backend's decimal and overdue-rule unit tests with `cd apps/api && npm test`. The Expo app type-checks with `cd apps/mobile && npm run typecheck`.

## Data and safety details

- Amounts are persisted as MySQL `DECIMAL(13,2)`. Outstanding balance is derived from original amount minus repayment records; do not add a second cached balance.
- A repayment is committed in a transaction after locking the associated loan row and verifying the current balance.
- Every financial query scopes records by the authenticated user's ID. A loan with repayment history cannot be deleted.
- Due dates are date-only values. The user's default timezone is `Asia/Kolkata`; overdue status is determined after the due date has passed in that timezone. The current initial API uses the server's current date for status serialization, so configure the server timezone consistently with user settings before supporting other zones.
- The `receipts` table stores metadata only. Binary upload and authenticated receipt retrieval are not implemented in this core build.
- Use `npx prisma migrate dev --name <change>` for local schema changes and `npx prisma migrate deploy` in deployment environments. Do not use `db push` for production schema changes.
- Logout clears the app's local access token. The current access JWT remains valid until its seven-day expiry; production should add refresh-token rotation and revocation.

## Production readiness

This is a local development implementation. Before deployment, configure a real SMS provider, refresh-token rotation/revocation, per-phone OTP throttling and cleanup, strict CORS origins, managed secrets, TLS database connections, encrypted backups, request audit/retention policy, timezone-aware due-date evaluation, secure private receipt storage, and production monitoring. Never use `.env.example` credentials in production.
