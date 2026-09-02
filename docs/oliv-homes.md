# OLIV Homes

OLIV Homes is a Nigerian property marketplace. Bayelsa is the primary launch market, with support for Rivers, Abuja, Lagos, Edo, Cross River, and other Nigerian states.

## Local setup

1. Add `MONGODB_URI` to the project environment. Optional: add `MONGODB_DB` (defaults to `oliv-homes`).
2. Install dependencies with `pnpm install`.
3. Seed the database with `pnpm seed`.
4. Start the app with `pnpm dev`.

The seed is repeatable: users and properties are upserted by email/slug. It creates MongoDB collections for users, sessions, properties, favorites, reviews, requests, notifications, reports, and audit logs as they are used.

## Seeded accounts

| Role | Email | Password | Access |
|---|---|---|---|
| User | `user@olivhomes.ng` | `OlivUser2026!` | Browse, save, request viewings, review listings |
| Agent | `agent@olivhomes.ng` | `OlivAgent2026!` | Agent onboarding, verified listing management, inquiries |
| Super admin | `admin@olivhomes.ng` | `OlivAdmin2026!` | Verification, moderation, user and platform operations |

These are development credentials only. Change or remove them before production and never publish them in a public deployment.

## Authentication and permissions

Authentication uses MongoDB users plus opaque, httpOnly sessions in the `sessions` collection. Passwords are salted and hashed server-side. Role checks must run on the server for every protected mutation; the UI is not a security boundary.

- `USER`: public discovery, favorites, viewing requests, inquiries, reviews.
- `AGENT`: agent tools only after onboarding/verification; agents can manage their own listings and requests.
- `ADMIN`: platform moderation, verification, audit visibility, and role management.

## Main routes

- `/` — Bayelsa-first marketplace homepage.
- `/discover` — filters, list/map discovery.
- `/listing/[id]` — gallery, map, property facts, reviews/comments.
- `/login`, `/signup`, `/profile` — account flows.
- `/agent/onboarding`, `/agent/dashboard` — agent activation and operations.
- `/admin` — super-admin operations.

## API surface

- `GET/POST/DELETE /api/auth` — session lookup, login, signup, logout.
- `GET /api/properties` — filtered property search.
- `GET/POST /api/reviews` — published comments and authenticated pending review submissions.
- Additional mutations should use `currentUser()`/`requireRole()` and validate ownership before writing.

## Production checklist

- Use a separate MongoDB database and rotate seeded passwords.
- Set `secure: true` for cookies behind HTTPS and configure trusted origins.
- Add rate limiting to login, signup, reviews, and inquiry endpoints.
- Add a real email/phone verification provider before granting agent verification.
- Keep `MONGODB_URI` server-only; never prefix it with `NEXT_PUBLIC_`.
- Add backups, monitoring, moderation retention, and privacy/terms pages before launch.
