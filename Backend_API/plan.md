# Spelmakerij Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Node.js REST API with JWT authentication for the Spelmakerij day-care planning app.

**Architecture:** Express app using ES modules. Routes handle HTTP concerns only; services contain all DB queries and business logic. `auth.js` at the root provides JWT verification and role-guard middleware used by all protected routes.

**Tech Stack:** Node.js (ES modules), Express 5, mysql2/promise, jsonwebtoken, bcryptjs, dotenv

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Create | Project metadata, `"type": "module"`, scripts |
| `.gitignore` | Create | Exclude `node_modules/` and `.env` |
| `.env.example` | Create | Credential template |
| `.env` | Create (not committed) | Actual credentials |
| `db.js` | Create | mysql2/promise pool, exported |
| `migrate.js` | Create | Runs `migrations/001_init.sql` and exits |
| `migrations/001_init.sql` | Create | CREATE TABLE for all 4 tables |
| `auth.js` | Create | `authenticate` middleware + `requireRole` factory |
| `services/authService.js` | Create | Login: lookup, bcrypt compare, JWT sign |
| `routes/auth.js` | Create | `POST /auth/login` |
| `services/cardsService.js` | Create | Get/upsert day plans |
| `routes/cards.js` | Create | `GET /cards/:date`, `PUT /cards/:date` |
| `services/absencesService.js` | Create | Get, create, delete absences |
| `routes/absences.js` | Create | `GET /absences`, `POST /absences`, `DELETE /absences/:id` |
| `services/accountsService.js` | Create | Get, create, update, delete user accounts |
| `routes/accounts.js` | Create | CRUD on `/accounts` |
| `services/builderDataService.js` | Create | Get, create, delete builder items |
| `routes/builderData.js` | Create | `GET /builder-data`, `POST /builder-data/:category`, `DELETE /builder-data/:category/:id` |
| `server.js` | Create | Entry point: loads env, mounts routes, verifies DB, listens |

---

## Task 1: Initialise the project

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.env` (not committed)

- [ ] **Step 1: Create package.json**

Create `Backend_API/package.json`:

```json
{
  "name": "spelmakerij-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "migrate": "node migrate.js"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd Backend_API
npm install express mysql2 dotenv jsonwebtoken bcryptjs
```

Expected: `node_modules/` created, `package.json` updated with `"dependencies"`.

- [ ] **Step 3: Create .gitignore**

Create `Backend_API/.gitignore`:

```
node_modules/
.env
```

- [ ] **Step 4: Create .env.example**

Create `Backend_API/.env.example`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=spelmakerij
PORT=3000
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRY=8h
```

- [ ] **Step 5: Create .env**

Copy `.env.example` to `.env` and fill in real MySQL credentials:

```bash
cp .env.example .env
```

Open `.env` and set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a real random string for `JWT_SECRET`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: initialise project with dependencies"
```

---

## Task 2: Database connection pool

**Files:**
- Create: `db.js`

- [ ] **Step 1: Create db.js**

Create `Backend_API/db.js`:

```js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
```

- [ ] **Step 2: Commit**

```bash
git add db.js
git commit -m "feat: add mysql2 promise pool"
```

---

## Task 3: Database migration

**Files:**
- Create: `migrations/001_init.sql`
- Create: `migrate.js`

- [ ] **Step 1: Create migrations/001_init.sql**

Create `Backend_API/migrations/001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('client', 'editor', 'admin') NOT NULL,
  initials VARCHAR(4) NOT NULL,
  email VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS day_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL UNIQUE,
  slots JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS absences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type ENUM('ziek', 'vakantie', 'anders') NOT NULL,
  from_date DATE,
  to_date DATE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS builder_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category ENUM('clienten', 'begeleiders', 'locaties', 'spellen') NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Create migrate.js**

Create `Backend_API/migrate.js`:

```js
import 'dotenv/config';
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const sql = readFileSync('migrations/001_init.sql', 'utf8');
await conn.query(sql);
console.log('Migration complete.');
await conn.end();
```

- [ ] **Step 3: Run the migration**

```bash
npm run migrate
```

Expected output: `Migration complete.`

If you see a connection error, check your `.env` values and that MySQL is running.

- [ ] **Step 4: Commit**

```bash
git add migrations/001_init.sql migrate.js
git commit -m "feat: add database migration script and schema"
```

---

## Task 4: Auth middleware

**Files:**
- Create: `auth.js`

- [ ] **Step 1: Create auth.js**

Create `Backend_API/auth.js`:

```js
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add auth.js
git commit -m "feat: add JWT authenticate middleware and requireRole factory"
```

---

## Task 5: Auth route and service

**Files:**
- Create: `services/authService.js`
- Create: `routes/auth.js`

- [ ] **Step 1: Create services/authService.js**

Create `Backend_API/services/authService.js`:

```js
import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function login(username, password) {
  const [rows] = await pool.query(
    'SELECT id, password_hash, name, role, initials, active FROM users WHERE username = ?',
    [username]
  );
  const user = rows[0];
  if (!user || !user.active) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;
  const token = jwt.sign(
    { sub: user.id, name: user.name, role: user.role, initials: user.initials },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '8h' }
  );
  return {
    token,
    user: { id: user.id, name: user.name, role: user.role, initials: user.initials },
  };
}
```

- [ ] **Step 2: Create routes/auth.js**

Create `Backend_API/routes/auth.js`:

```js
import { Router } from 'express';
import { login } from '../services/authService.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const result = await login(username, password);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add services/authService.js routes/auth.js
git commit -m "feat: add login endpoint with JWT issuance"
```

---

## Task 6: Cards route and service

**Files:**
- Create: `services/cardsService.js`
- Create: `routes/cards.js`

- [ ] **Step 1: Create services/cardsService.js**

Create `Backend_API/services/cardsService.js`:

```js
import pool from '../db.js';

export async function getCards(date) {
  const [rows] = await pool.query('SELECT slots FROM day_plans WHERE date = ?', [date]);
  if (!rows.length) return { date, slots: [[], [], [], []] };
  return { date, slots: rows[0].slots };
}

export async function putCards(date, slots) {
  await pool.query(
    `INSERT INTO day_plans (date, slots)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE slots = VALUES(slots), updated_at = CURRENT_TIMESTAMP`,
    [date, JSON.stringify(slots)]
  );
}
```

- [ ] **Step 2: Create routes/cards.js**

Create `Backend_API/routes/cards.js`:

```js
import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { getCards, putCards } from '../services/cardsService.js';

const router = Router();

router.get('/:date', authenticate, async (req, res) => {
  try {
    const result = await getCards(req.params.date);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:date', authenticate, requireRole('editor'), async (req, res) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots) || slots.length !== 4) {
      return res.status(400).json({ error: 'slots must be an array of 4 arrays' });
    }
    await putCards(req.params.date, slots);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add services/cardsService.js routes/cards.js
git commit -m "feat: add cards GET and PUT endpoints"
```

---

## Task 7: Absences route and service

**Files:**
- Create: `services/absencesService.js`
- Create: `routes/absences.js`

- [ ] **Step 1: Create services/absencesService.js**

Create `Backend_API/services/absencesService.js`:

```js
import pool from '../db.js';

export async function getAbsences(date) {
  if (date) {
    const [rows] = await pool.query('SELECT * FROM absences WHERE date = ?', [date]);
    return rows;
  }
  const [rows] = await pool.query('SELECT * FROM absences ORDER BY date DESC');
  return rows;
}

export async function createAbsence({ name, date, type, fromDate, toDate, reason }) {
  const [result] = await pool.query(
    'INSERT INTO absences (name, date, type, from_date, to_date, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [name, date, type, fromDate ?? null, toDate ?? null, reason ?? null]
  );
  const [rows] = await pool.query('SELECT * FROM absences WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function deleteAbsence(id) {
  const [result] = await pool.query('DELETE FROM absences WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
```

- [ ] **Step 2: Create routes/absences.js**

Create `Backend_API/routes/absences.js`:

```js
import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { getAbsences, createAbsence, deleteAbsence } from '../services/absencesService.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const absences = await getAbsences(req.query.date);
    res.json({ absences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, date, type, fromDate, toDate, reason } = req.body;
    if (!name || !date || !type) {
      return res.status(400).json({ error: 'name, date, and type are required' });
    }
    if (type === 'vakantie' && (!fromDate || !toDate)) {
      return res.status(400).json({ error: 'fromDate and toDate are required for vakantie' });
    }
    const absence = await createAbsence({ name, date, type, fromDate, toDate, reason });
    res.status(201).json({ absence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireRole('editor', 'admin'), async (req, res) => {
  try {
    const found = await deleteAbsence(req.params.id);
    if (!found) return res.status(404).json({ error: 'Absence not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add services/absencesService.js routes/absences.js
git commit -m "feat: add absences GET, POST, and DELETE endpoints"
```

---

## Task 8: Accounts route and service

**Files:**
- Create: `services/accountsService.js`
- Create: `routes/accounts.js`

- [ ] **Step 1: Create services/accountsService.js**

Create `Backend_API/services/accountsService.js`:

```js
import pool from '../db.js';
import bcrypt from 'bcryptjs';

function deriveInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
}

const SELECT_COLS = 'id, username, name, role, initials, email, active, created_at';

export async function getAccounts() {
  const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users`);
  return rows;
}

export async function createAccount({ name, username, role, email, password }) {
  const password_hash = await bcrypt.hash(password, 10);
  const initials = deriveInitials(name);
  const [result] = await pool.query(
    'INSERT INTO users (username, password_hash, name, role, initials, email) VALUES (?, ?, ?, ?, ?, ?)',
    [username, password_hash, name, role, initials, email ?? null]
  );
  const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users WHERE id = ?`, [result.insertId]);
  return rows[0];
}

export async function updateAccount(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?', 'initials = ?');
    values.push(updates.name, deriveInitials(updates.name));
  }
  if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
  if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (updates.password !== undefined) {
    fields.push('password_hash = ?');
    values.push(await bcrypt.hash(updates.password, 10));
  }
  if (updates.active !== undefined) { fields.push('active = ?'); values.push(updates.active); }

  if (!fields.length) {
    const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users WHERE id = ?`, [id]);
    return rows[0] ?? null;
  }

  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users WHERE id = ?`, [id]);
  return rows[0] ?? null;
}

export async function deleteAccount(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
```

- [ ] **Step 2: Create routes/accounts.js**

Create `Backend_API/routes/accounts.js`:

```js
import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/accountsService.js';

const router = Router();

router.get('/', authenticate, requireRole('editor'), async (req, res) => {
  try {
    const accounts = await getAccounts();
    res.json({ accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireRole('editor'), async (req, res) => {
  try {
    const { name, username, role, email, password } = req.body;
    if (!name || !username || !role || !password) {
      return res.status(400).json({ error: 'name, username, role, and password are required' });
    }
    const account = await createAccount({ name, username, role, email, password });
    res.status(201).json({ account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, requireRole('editor'), async (req, res) => {
  try {
    const account = await updateAccount(req.params.id, req.body);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireRole('editor'), async (req, res) => {
  try {
    const found = await deleteAccount(req.params.id);
    if (!found) return res.status(404).json({ error: 'Account not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add services/accountsService.js routes/accounts.js
git commit -m "feat: add accounts CRUD endpoints"
```

---

## Task 9: Builder data route and service

**Files:**
- Create: `services/builderDataService.js`
- Create: `routes/builderData.js`

- [ ] **Step 1: Create services/builderDataService.js**

Create `Backend_API/services/builderDataService.js`:

```js
import pool from '../db.js';

const CATEGORY_TYPE = {
  clienten: 'client',
  begeleiders: 'sup-blue',
  locaties: 'location',
  spellen: 'game',
};

export async function getBuilderData() {
  const [rows] = await pool.query('SELECT * FROM builder_items ORDER BY sort_order ASC');
  return {
    clienten:    rows.filter(r => r.category === 'clienten'),
    begeleiders: rows.filter(r => r.category === 'begeleiders'),
    locaties:    rows.filter(r => r.category === 'locaties'),
    spellen:     rows.filter(r => r.category === 'spellen'),
  };
}

export async function createBuilderItem(category, name) {
  const type = CATEGORY_TYPE[category];
  const [[{ next_order }]] = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM builder_items WHERE category = ?',
    [category]
  );
  const [result] = await pool.query(
    'INSERT INTO builder_items (category, name, type, sort_order) VALUES (?, ?, ?, ?)',
    [category, name, type, next_order]
  );
  const [rows] = await pool.query('SELECT * FROM builder_items WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function deleteBuilderItem(category, id) {
  const [result] = await pool.query(
    'DELETE FROM builder_items WHERE id = ? AND category = ?',
    [id, category]
  );
  return result.affectedRows > 0;
}
```

- [ ] **Step 2: Create routes/builderData.js**

Create `Backend_API/routes/builderData.js`:

```js
import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { getBuilderData, createBuilderItem, deleteBuilderItem } from '../services/builderDataService.js';

const router = Router();
const VALID_CATEGORIES = ['clienten', 'begeleiders', 'locaties', 'spellen'];

router.get('/', authenticate, requireRole('editor', 'admin'), async (req, res) => {
  try {
    const data = await getBuilderData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:category', authenticate, requireRole('editor'), async (req, res) => {
  try {
    const { category } = req.params;
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const item = await createBuilderItem(category, name);
    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:category/:id', authenticate, requireRole('editor'), async (req, res) => {
  try {
    const { category, id } = req.params;
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const found = await deleteBuilderItem(category, id);
    if (!found) return res.status(404).json({ error: 'Item not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add services/builderDataService.js routes/builderData.js
git commit -m "feat: add builder-data GET, POST, and DELETE endpoints"
```

---

## Task 10: Server entry point

**Files:**
- Create: `server.js`

- [ ] **Step 1: Create server.js**

Create `Backend_API/server.js`:

```js
import 'dotenv/config';
import express from 'express';
import pool from './db.js';
import authRouter from './routes/auth.js';
import cardsRouter from './routes/cards.js';
import absencesRouter from './routes/absences.js';
import accountsRouter from './routes/accounts.js';
import builderDataRouter from './routes/builderData.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/auth', authRouter);
app.use('/cards', cardsRouter);
app.use('/absences', absencesRouter);
app.use('/accounts', accountsRouter);
app.use('/builder-data', builderDataRouter);

// Verify DB connection on startup
try {
  const conn = await pool.getConnection();
  conn.release();
  console.log('Database connection established.');
} catch (err) {
  console.error('Failed to connect to the database:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

- [ ] **Step 2: Start the server**

```bash
npm start
```

Expected output:
```
Database connection established.
API server running on port 3000
```

- [ ] **Step 3: Smoke test login**

If you have a user in the DB, test with curl:

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_user","password":"your_pass"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
```

Expected: `{ "token": "...", "user": { "id": ..., "name": "...", "role": "...", "initials": "..." } }`

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add server entry point, mount all routes"
```

---

## Done

Final structure:

```
Backend_API/
├── server.js
├── auth.js
├── db.js
├── migrate.js
├── routes/
│   ├── auth.js
│   ├── cards.js
│   ├── absences.js
│   ├── accounts.js
│   └── builderData.js
├── services/
│   ├── authService.js
│   ├── cardsService.js
│   ├── absencesService.js
│   ├── accountsService.js
│   └── builderDataService.js
├── migrations/
│   └── 001_init.sql
├── .env               (local only)
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```
