import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app  = express();
const PORT = Number(process.env.PORT || 3001);

// ─── Connection ────────────────────────────────────────────────────────────────

const fallbackConnectionString = [
  `postgresql://${process.env.PGUSER || process.env.USER || 'postgres'}`,
  `:${process.env.PGPASSWORD || ''}`,
  `@${process.env.PGHOST || '127.0.0.1'}`,
  `:${process.env.PGPORT || '5432'}`,
  `/${process.env.PGDATABASE || 'mbk_local'}`
].join('');

const connectionString = process.env.DATABASE_URL || fallbackConnectionString;
const shouldUseSsl =
  process.env.PGSSLMODE === 'require' ||
  (connectionString.includes('render.com') && !connectionString.includes('localhost'));

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false
});

// ─── Domain Configuration ──────────────────────────────────────────────────────
//
// Maps every frontend state key to a dedicated PostgreSQL table.
// kind='array'  → one row per item, keyed by item.id (TEXT)
// kind='single' → one singleton row per table, id='singleton'

const DOMAIN_CONFIG = {
  // ── HR / Attendance ──────────────────────────────────────────────────────────
  'mbk.hr.staff':              { table: 'staff_accounts',     kind: 'array'  },
  'mbk.attendance.logs':       { table: 'attendance_logs',    kind: 'array'  },
  'mbk.hr.schedules':          { table: 'work_schedules',     kind: 'array'  },
  'mbk.hr.staff-availability': { table: 'staff_availability', kind: 'array'  },
  'mbk.hr.leave-requests':     { table: 'leave_requests',     kind: 'array'  },
  'mbk.hr.day-off-blocks':     { table: 'day_off_blocks',     kind: 'array'  },
  'mbk.hr.payroll-policy':     { table: 'payroll_policy',     kind: 'single' },
  'mbk.hr.master-admin':       { table: 'master_admin_creds', kind: 'single' },
  'mbk.hr.admin-session':      { table: 'admin_sessions',     kind: 'single' },
  'mbk.staff.app-session':     { table: 'app_sessions',       kind: 'single' },

  // ── Orders ───────────────────────────────────────────────────────────────────
  'mbk.orders.queue':          { table: 'orders',             kind: 'array'  },
  'mbk.order.counter':         { table: 'order_counter',      kind: 'single' },

  // ── Finance ──────────────────────────────────────────────────────────────────
  'mbk.admin.finance.entries': { table: 'finance_entries',    kind: 'array'  },

  // ── Inventory / Menu ─────────────────────────────────────────────────────────
  'mbk.admin.inventory':       { table: 'inventory_items',      kind: 'array'  },
  'mbk.admin.menu':            { table: 'menu_definitions',     kind: 'array'  },
  'mbk.admin.categories':      { table: 'menu_categories',      kind: 'single' },
  'mbk.inventory.operations':  { table: 'inventory_operations', kind: 'array'  },
  'mbk.inventory.auditlog':    { table: 'inventory_audit_log',  kind: 'array'  },

  // ── Customers ────────────────────────────────────────────────────────────────
  'mbk.customer.accounts':     { table: 'customer_accounts',  kind: 'array'  },
  'mbk.customer.session':      { table: 'customer_sessions',  kind: 'single' },

  // ── Logging / Budget ─────────────────────────────────────────────────────────
  'mbk.app.action-logs':       { table: 'action_logs',         kind: 'array'  },
  'mbk.staff-budget.usage':    { table: 'staff_budget_usage',  kind: 'array'  },
  'mbk.staff-budget.wastage':  { table: 'wastage_records',     kind: 'array'  },

  // ── Events / Checklists ──────────────────────────────────────────────────────
  'events':              { table: 'events',              kind: 'array'  },
  'checklist_templates': { table: 'checklist_templates', kind: 'array'  },

  // ── Testing ──────────────────────────────────────────────────────────────────
  'mbk.testing.clock':   { table: 'app_clock',           kind: 'single' }
};

// Deduplicated table name lists (used for DDL generation)
const ARRAY_TABLES  = [...new Set(Object.values(DOMAIN_CONFIG).filter(c => c.kind === 'array' ).map(c => c.table))];
const SINGLE_TABLES = [...new Set(Object.values(DOMAIN_CONFIG).filter(c => c.kind === 'single').map(c => c.table))];

// ─── DB Helpers ────────────────────────────────────────────────────────────────

/** Read all rows from an array-domain table, ordered by insert time */
async function readDomainArray(table) {
  const result = await pool.query(
    `SELECT data FROM "${table}" ORDER BY updated_at ASC, id ASC`
  );
  return result.rows.map(r => r.data);
}

/** Fully replace all rows in an array-domain table (transactional) */
async function writeDomainArray(table, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM "${table}"`);
    for (const item of items) {
      const id = String(item.id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      await client.query(
        `INSERT INTO "${table}" (id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [id, JSON.stringify(item)]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Read the singleton row from a single-domain table */
async function readDomainSingle(table) {
  const result = await pool.query(
    `SELECT data FROM "${table}" WHERE id = 'singleton'`
  );
  return result.rows[0]?.data ?? null;
}

/** Upsert the singleton row in a single-domain table */
async function writeDomainSingle(table, value) {
  await pool.query(
    `INSERT INTO "${table}" (id, data, updated_at)
     VALUES ('singleton', $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(value)]
  );
}

/** Delete all rows from a domain table */
async function clearDomainTable(table) {
  await pool.query(`DELETE FROM "${table}"`);
}

// ─── Generic (fallback) State ─────────────────────────────────────────────────

async function readGenericState(key) {
  const result = await pool.query(`SELECT value FROM app_state WHERE key = $1`, [key]);
  return result.rows[0]?.value ?? null;
}

async function writeGenericState(key, value) {
  await pool.query(
    `INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

async function deleteGenericState(key) {
  await pool.query(`DELETE FROM app_state WHERE key = $1`, [key]);
}

// ─── Unified State Accessors ──────────────────────────────────────────────────

async function readState(key) {
  const domain = DOMAIN_CONFIG[key];
  if (!domain) return readGenericState(key);
  return domain.kind === 'array' ? readDomainArray(domain.table) : readDomainSingle(domain.table);
}

async function writeState(key, value) {
  const domain = DOMAIN_CONFIG[key];
  if (!domain) return writeGenericState(key, value);
  if (domain.kind === 'array') return writeDomainArray(domain.table, Array.isArray(value) ? value : []);
  return writeDomainSingle(domain.table, value);
}

async function deleteState(key) {
  const domain = DOMAIN_CONFIG[key];
  if (!domain) return deleteGenericState(key);
  return clearDomainTable(domain.table);
}

/**
 * Return a full snapshot of all state.
 * Array domains are always returned, including empty arrays, so a reset state
 * remains explicitly empty and does not trigger frontend fallback defaults.
 * Null singleton rows remain omitted because some stores expect object fallbacks.
 */
async function listAllState() {
  const snapshot = {};

  for (const [key, domain] of Object.entries(DOMAIN_CONFIG)) {
    try {
      if (domain.kind === 'array') {
        const arr = await readDomainArray(domain.table);
        snapshot[key] = arr;
      } else {
        const val = await readDomainSingle(domain.table);
        if (val !== null) snapshot[key] = val;
      }
    } catch {
      // Table may not yet exist during first-boot — silently skip
    }
  }

  // Merge generic state (any keys not mapped to domain tables)
  const genericRows = await pool.query(`SELECT key, value FROM app_state`);
  for (const row of genericRows.rows) {
    snapshot[row.key] = row.value;
  }

  return snapshot;
}

async function resetState(keys = [], prefixes = []) {
  const validKeys     = keys.filter(k => typeof k === 'string' && k.trim());
  const validPrefixes = prefixes.filter(p => typeof p === 'string' && p.trim());
  const resetAll      = validKeys.length === 0 && validPrefixes.length === 0;

  const domainKeysToDelete = resetAll
    ? Object.keys(DOMAIN_CONFIG)
    : Object.keys(DOMAIN_CONFIG).filter(key =>
        validKeys.includes(key) ||
        validPrefixes.some(prefix => key.startsWith(prefix))
      );

  for (const key of domainKeysToDelete) {
    await clearDomainTable(DOMAIN_CONFIG[key].table);
  }

  if (resetAll) {
    await pool.query(`DELETE FROM app_state`);
  } else {
    if (validKeys.length > 0) {
      await pool.query(`DELETE FROM app_state WHERE key = ANY($1::text[])`, [validKeys]);
    }
    for (const prefix of validPrefixes) {
      await pool.query(`DELETE FROM app_state WHERE key LIKE $1`, [`${prefix}%`]);
    }
  }
}

// ─── Schema Initialisation ─────────────────────────────────────────────────────

async function initDb() {
  // Generic fallback table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key        TEXT        PRIMARY KEY,
      value      JSONB       NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Array-domain tables: one row per entity item
  for (const table of ARRAY_TABLES) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${table}" (
        id         TEXT        NOT NULL,
        data       JSONB       NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id)
      )
    `);
  }

  // Single-domain tables: always one singleton row
  for (const table of SINGLE_TABLES) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${table}" (
        id         TEXT        NOT NULL DEFAULT 'singleton',
        data       JSONB       NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id)
      )
    `);
  }

  // Useful indexes for common query patterns
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_attendance_logs_staff    ON attendance_logs    ((data->>'staffId'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_work_schedules_date      ON work_schedules     ((data->>'date'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_work_schedules_staff     ON work_schedules     ((data->>'staffId'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status            ON orders             ((data->>'status'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created           ON orders             ((data->>'createdAt'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_finance_entries_type     ON finance_entries    ((data->>'type'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_action_logs_module       ON action_logs        ((data->>'module'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_staff     ON leave_requests     ((data->>'staffId'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customer_accounts_email  ON customer_accounts  ((data->>'email'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_inv_operations_type      ON inventory_operations ((data->>'type'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_budget_usage_month ON staff_budget_usage  ((data->>'monthKey'))`);

  console.log(
    `Database schema initialised ` +
    `(${ARRAY_TABLES.length} array tables + ${SINGLE_TABLES.length} single tables + 1 generic = ` +
    `${ARRAY_TABLES.length + SINGLE_TABLES.length + 1} total).`
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(v => v.trim()).filter(Boolean)
    : false // Deny cross-origin requests if CORS_ORIGIN is not explicitly configured
}));
app.use(express.json({ limit: '4mb' }));

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      ok: true,
      database: 'postgres',
      tables: ARRAY_TABLES.length + SINGLE_TABLES.length + 1,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Database unavailable.' });
  }
});

// ─── Generic State API (used by RemoteStateService in Angular) ────────────────

app.get('/api/state', async (req, res, next) => {
  try {
    res.json(await listAllState());
  } catch (error) {
    next(error);
  }
});

app.get('/api/state/:key', async (req, res, next) => {
  try {
    const value = await readState(req.params.key);
    if (value === null) {
      res.status(404).json({ error: 'State key not found.' });
      return;
    }
    res.json({ key: req.params.key, value });
  } catch (error) {
    next(error);
  }
});

app.put('/api/state/:key', async (req, res, next) => {
  try {
    if (!Object.prototype.hasOwnProperty.call(req.body, 'value')) {
      res.status(400).json({ error: 'Request body must include a value property.' });
      return;
    }
    await writeState(req.params.key, req.body.value);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/state/:key', async (req, res, next) => {
  try {
    await deleteState(req.params.key);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/state/reset', async (req, res, next) => {
  try {
    const { keys = [], prefixes = [] } = req.body || {};
    await resetState(keys, prefixes);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── Legacy convenience endpoints (kept for compatibility) ────────────────────

app.get('/api/inventory', async (req, res, next) => {
  try { res.json(await readDomainArray('inventory_items')); }
  catch (error) { next(error); }
});

app.get('/api/menu', async (req, res, next) => {
  try { res.json(await readDomainArray('menu_definitions')); }
  catch (error) { next(error); }
});

app.get('/api/finance', async (req, res, next) => {
  try { res.json(await readDomainArray('finance_entries')); }
  catch (error) { next(error); }
});

// ─── Domain-specific read endpoints (for direct queries / reporting) ──────────

app.get('/api/staff', async (req, res, next) => {
  try {
    const staffAccounts = await readDomainArray('staff_accounts');
    res.json(staffAccounts.map(({ passwordHash, pin, ...staff }) => staff));
  } catch (error) {
    next(error);
  }
});


app.get('/api/orders', async (req, res, next) => {
  try {
    const orders = await readDomainArray('orders');
    const { status } = req.query;
    res.json(status ? orders.filter(o => o.status === status) : orders);
  } catch (error) { next(error); }
});

app.get('/api/finance-entries', async (req, res, next) => {
  try {
    const entries = await readDomainArray('finance_entries');
    const { type } = req.query;
    res.json(type ? entries.filter(e => e.type === type) : entries);
  } catch (error) { next(error); }
});

app.get('/api/attendance', async (req, res, next) => {
  try {
    const logs = await readDomainArray('attendance_logs');
    const { staffId } = req.query;
    res.json(staffId ? logs.filter(l => l.staffId === staffId) : logs);
  } catch (error) { next(error); }
});

app.get('/api/schedules', async (req, res, next) => {
  try {
    let schedules = await readDomainArray('work_schedules');
    if (req.query.date)    schedules = schedules.filter(s => s.date === req.query.date);
    if (req.query.staffId) schedules = schedules.filter(s => s.staffId === req.query.staffId);
    res.json(schedules);
  } catch (error) { next(error); }
});

app.get('/api/leave-requests', async (req, res, next) => {
  try {
    const reqs = await readDomainArray('leave_requests');
    const { staffId } = req.query;
    res.json(staffId ? reqs.filter(r => r.staffId === staffId) : reqs);
  } catch (error) { next(error); }
});

app.get('/api/action-logs', async (req, res, next) => {
  try {
    const logs = await readDomainArray('action_logs');
    const { module } = req.query;
    res.json(module ? logs.filter(l => l.module === module) : logs);
  } catch (error) { next(error); }
});

app.get('/api/customers', async (req, res, next) => {
  try { res.json(await readDomainArray('customer_accounts')); }
  catch (error) { next(error); }
});

app.get('/api/events', async (req, res, next) => {
  try { res.json(await readDomainArray('events')); }
  catch (error) { next(error); }
});

app.get('/api/checklist-templates', async (req, res, next) => {
  try { res.json(await readDomainArray('checklist_templates')); }
  catch (error) { next(error); }
});

// ─── Static Frontend ──────────────────────────────────────────────────────────

const frontendDistCandidates = [
  path.resolve(__dirname, '../frontend/dist/mbk-app/browser'),
  path.resolve(__dirname, '../frontend/dist/mbk-app')
];

const frontendDist = frontendDistCandidates.find(candidate =>
  fs.existsSync(path.join(candidate, 'index.html'))
);
if (frontendDist) {
  console.log(`Serving frontend from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) { next(); return; }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  console.warn('Frontend dist not found. Checked:', frontendDistCandidates);
}

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((error, req, res, _next) => {
  void req;
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MBK backend running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialise backend:', error);
    process.exit(1);
  });
