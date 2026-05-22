# MBK PostgreSQL and Render Setup

## What changed

The app no longer treats browser localStorage as the primary database.

Persistence now goes through:
- Angular `RemoteStateService`
- Express backend in `backend/server.js`
- PostgreSQL table `app_state` using `JSONB`

This keeps the current app behavior intact while moving storage to PostgreSQL so local development and Render deployment use the same persistence model.

## Current architecture

- Frontend: Angular app in `frontend/`
- Backend: Express app in `backend/`
- Database: PostgreSQL
- Deployment shape: one Render web service serving the Angular build and `/api`, plus one Render PostgreSQL database

## Local development

### Option 1: Use your existing Homebrew PostgreSQL

1. Make sure PostgreSQL is running.
2. Create the database if needed:
   `createdb mbk_local`
3. Copy backend envs:
   `cd backend && cp .env.example .env`
4. If your local Postgres user is not `postgres`, adjust `.env`.
5. Start the backend:
   `cd backend && npm install && npm run dev`
6. Start the frontend:
   `cd frontend && npm install && npm start`

The Angular dev server proxies `/api` to `http://localhost:3001` through `frontend/proxy.conf.json`.

### Option 2: Use Docker

1. Start PostgreSQL:
   `docker compose up -d postgres`
2. Copy backend envs:
   `cd backend && cp .env.example .env`
3. Start backend:
   `cd backend && npm install && npm run dev`
4. Start frontend:
   `cd frontend && npm install && npm start`

## Render deployment

The repository now includes `render.yaml`.

It provisions:
- one Node web service
- one PostgreSQL database

Render flow:
1. Create a new Blueprint in Render using this repo.
2. Render reads `render.yaml`.
3. The build command installs frontend deps, builds Angular, then installs backend deps.
4. The Node backend serves the built Angular app and the `/api` endpoints.
5. `DATABASE_URL` is injected from the Render PostgreSQL instance.

## Important notes

- The app state is stored in PostgreSQL as named state buckets in `app_state`.
- This is intentionally a compatibility-first migration.
- It keeps the app functional without forcing a full relational rewrite of every module today.
- A later phase can normalize `app_state` into dedicated tables for orders, staff, schedules, finance, inventory, and auth.

## Useful endpoints

- Health check: `/api/health`
- Full state snapshot: `/api/state`
- Single state key: `/api/state/:key`

## Verified locally

The updated backend was smoke-tested against local PostgreSQL with:
- successful server startup
- successful `/api/health`
- successful state write/read round-trip through `/api/state`
