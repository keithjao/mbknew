# MBK Manual Test Steps

## 1. Start the app locally

### Backend

Use the updated PostgreSQL-backed backend on port `3001`.

If PostgreSQL is already running locally:

```bash
createdb mbk_local || true
PGUSER="$USER" PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=mbk_local PGPASSWORD='' PORT=3001 node /Users/keithjao/Documents/MBK4.0/backend/server.js
```

If you prefer the env file flow:

```bash
cd /Users/keithjao/Documents/MBK4.0/backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd /Users/keithjao/Documents/MBK4.0/frontend
npm install
npm start
```

Open:
- `http://localhost:4200`
- Admin access: `http://localhost:4200/admin/access`

## 2. Smoke test

### Backend health

In a separate terminal:

```bash
curl http://127.0.0.1:3001/api/health
```

Expected result:
- JSON response with `"ok": true`
- `"database": "postgres"`

### State API

```bash
curl http://127.0.0.1:3001/api/state
```

Expected result:
- JSON object
- Empty object on a fresh database is valid

## 3. Fresh-start and admin recovery test

1. Open `http://localhost:4200/admin/access`
2. Click `restore bootstrap admin`
3. Verify the page shows the temporary bootstrap credential
4. Sign in with:
   - username: `admin`
   - password: `MbkMaster@123`
5. Verify the app forces a password change
6. Set a new strong password
7. Sign out
8. Sign back in using the new password

Expected result:
- Bootstrap login works
- Forced password change works
- New password persists after sign-out

## 4. Reset flow test

1. From admin access, click `reset local app data`
2. Wait for reload
3. Sign in again with bootstrap admin

Expected result:
- Old app data is gone
- Bootstrap admin is restored
- This should now reflect PostgreSQL-backed state reset, not browser-only reset

## 5. Inventory and menu test

1. Sign in to admin
2. Go to master inventory
3. Add a new inventory item
4. Edit that item
5. Delete another test item if needed
6. Go to menu builder or menu admin
7. Create a menu item using inventory ingredients
8. Edit the menu item

Expected result:
- Inventory and menu changes appear immediately in the UI
- Refreshing the page keeps the changes

## 6. POS and queue-board test

1. Go to POS
2. Create an order with at least 2 items
3. Mark payment as paid or partial if the flow allows it
4. Open queue board
5. Verify the order appears in queue
6. Move order through statuses:
   - queued
   - preparing
   - ready
   - completed
7. Create another order
8. Cancel that order

Expected result:
- Orders appear on queue board
- Status changes persist after refresh
- Cancelled or completed items behave correctly

## 7. Finance test

1. Open finance
2. Add a manual spending entry
3. Add a manual sale entry if the screen supports it
4. Refresh the page
5. Re-open finance

Expected result:
- Entries remain after refresh
- Totals and lists still render correctly

## 8. HR and staff account test

1. Open HR
2. Create a new staff account
3. Save the generated workspace credentials
4. Sign out from admin
5. On admin access, switch to `staff workspace`
6. Sign in with the new staff username and temporary password
7. Change the temporary password
8. Confirm staff can access allowed internal screens
9. Sign out and sign back in with the changed password

Expected result:
- Staff workspace login works
- Forced staff password change works
- New credentials persist

## 9. Attendance and clock-in test

1. Go to clock-in/out
2. Use a staff code and pin to clock in
3. If supported, clock out afterward
4. Return to HR or reports
5. Verify the attendance log is present

Expected result:
- Attendance entries are created
- Logs remain after refresh

## 10. Scheduling test

1. Open HR scheduling
2. Create a few schedules for multiple staff
3. Confirm weekday coverage warnings work
4. Confirm weekend coverage warnings work
5. Open schedule center
6. Submit staff availability
7. Submit a leave request
8. Go back to HR and confirm the availability and leave data appears

Expected result:
- Schedule data saves
- Availability and leave requests persist
- Coverage summaries still render

## 11. Event operations test

1. Open event operations
2. Create a checklist template
3. Create an event using that template
4. Edit checklist items
5. Mark items packed
6. Refresh the page

Expected result:
- Templates persist
- Events persist
- Checklist changes persist

## 12. Customer account test

1. Open the public account page
2. Create a customer account
3. Sign out
4. Sign back in with the same credentials
5. Refresh the page

Expected result:
- Customer auth still works
- Session and account data persist through PostgreSQL-backed state

## 13. Persistence test across restart

This is the critical PostgreSQL check.

1. Create some test data:
   - one inventory item
   - one staff account
   - one order
   - one finance entry
2. Stop the frontend server
3. Stop the backend server
4. Start the backend again
5. Start the frontend again
6. Re-open the app

Expected result:
- Previously created data is still there
- If data disappears here, persistence is not correctly using PostgreSQL

## 14. Database-level verification

You can inspect stored state directly:

```bash
psql mbk_local -c "select key, updated_at from app_state order by key;"
```

Expected result:
- You should see keys such as:
  - `mbk.hr.staff`
  - `mbk.attendance.logs`
  - `mbk.orders.queue`
  - `mbk.admin.finance.entries`
  - `events`
  - `checklist_templates`

## 15. Render readiness check

Before deploying:

1. Confirm frontend build passes:

```bash
cd /Users/keithjao/Documents/MBK4.0/frontend && npm run build
```

2. Confirm backend starts cleanly with PostgreSQL
3. Confirm `render.yaml` exists in repo root
4. Confirm `backend/.env.example` is accurate
5. Confirm `POSTGRES_RENDER_SETUP.md` matches your intended deployment flow

Expected result:
- Build passes
- Backend health endpoint works
- Render blueprint files are present

## 16. Known current limitation

The app is now PostgreSQL-backed through a shared JSONB state table.

That means:
- this is deployment-aligned with Render
- persistence is no longer primarily browser localStorage
- but the data model is not yet fully normalized into separate relational tables

That is acceptable for this migration phase and is the correct bridge to production deployment alignment.
