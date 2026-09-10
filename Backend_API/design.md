# Node.js API Starter — Design Spec

**Date:** 2026-03-27
**Project:** spelmakerij-planboard / Backend_API

## Overview

A minimal Node.js REST API starter with Express and a MySQL database connection. No business logic or routes yet — just a working skeleton ready for feature development.

## Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MySQL (via `mysql2`)
- **Config:** `.env` file

## File Structure

```
Backend_API/
├── index.js        # Express app entry point, boots server, tests DB on startup
├── db.js           # MySQL2 connection pool, exported for use in routes
├── routes/         # Empty directory, ready for route files
├── .env            # DB credentials and port (not committed)
├── .env.example    # Credential template
├── .gitignore      # Ignores node_modules and .env
└── package.json
```

## Component Responsibilities

### `db.js`
- Creates a `mysql2` connection pool using environment variables
- Exports the pool for use anywhere in the app

### `index.js`
- Loads `.env` via `dotenv`
- Imports the DB pool and calls `getConnection()` on startup to verify connectivity
- Initialises Express
- Mounts route files from `routes/` (currently none)
- Starts listening on `process.env.PORT` (default 3000)

### `.env` variables
| Variable     | Description              |
|--------------|--------------------------|
| `DB_HOST`    | MySQL host               |
| `DB_PORT`    | MySQL port (default 3306)|
| `DB_USER`    | MySQL username           |
| `DB_PASSWORD`| MySQL password           |
| `DB_NAME`    | Database name            |
| `PORT`       | API server port          |

## What is NOT included

- No routes or controllers
- No authentication
- No ORM or query builder
- No retry logic
- No health-check endpoint

These will be added as features are built out.
