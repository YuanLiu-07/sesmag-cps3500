# CPS3500 SESMag Project

SESMag full-stack project for **CPS3500**.

- Student: **Yuan Liu**
- Student ID: **1306116**
- Stack: React + Vite + Tailwind, Node.js + Express, PostgreSQL
- Deployment target: Vercel (frontend + serverless API)

## Features completed

- PostgreSQL schema and seed scripts (`db/schema.sql`, `db/seed.sql`)
- Login/logout + registration
- Password hashing with `bcryptjs`
- Security practices (`helmet`, `express-rate-limit`, input validation with `zod`, HTTP-only JWT cookie)
- Access control / roles:
  - `employee`: can view own session/profile
  - `hr` / `manager`: can list all users
- Unit tests + integration test (Vitest + Supertest)

## Local setup

1. Create database `sesmag_db` in PostgreSQL.
2. Copy env:
   - `cp .env.example .env`
3. Run SQL scripts:
   - `psql "$DATABASE_URL" -f db/schema.sql`
   - `psql "$DATABASE_URL" -f db/seed.sql`
4. Install packages:
   - Root: `npm install`
   - Client: `cd client && npm install`
5. Run backend:
   - `npm run dev`
6. Run frontend (new terminal):
   - `npm run client:dev`

## Demo accounts

All seeded users use password: `Password123!`

- `yuan.liu@example.com` (manager)
- `hannah.hr@example.com` (hr)
- `alex.employee@example.com` (employee)

## Tests

Run:

```bash
npm test
```

## Vercel deployment

1. Push this repo to GitHub.
2. In Vercel, import the repository.
3. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN` (your Vercel domain)
   - `NODE_ENV=production`
4. Deploy.

## Assignment submission tips

- Take screenshots for:
  - Login page
  - Role-based access view (employee vs HR/manager)
  - Database table/sample data
  - Test results (`npm test`)
- Put screenshots + SESMag/DAV analysis in one PDF for submission.
