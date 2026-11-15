/**
 * TaskFlow - Database layer
 * SQLite via better-sqlite3. Creates the schema on first run and seeds
 * 6 sample tasks so the dashboard is never empty on a fresh install.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tasks.db');
const db = new Database(DB_PATH);

// WAL mode = better concurrency for read-heavy dashboard workloads.
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in-progress', 'done')),
    priority    TEXT    NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
    due_date    TEXT,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );
`);

/* ------------------------------------------------------------------ */
/* Seed data (only inserted when the table is empty)                   */
/* ------------------------------------------------------------------ */

const taskCount = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;

if (taskCount === 0) {
  const now = new Date().toISOString();

  // Dates are computed relative to "today" so the demo always shows
  // upcoming and overdue examples no matter when the app is first run.
  const dayOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const seedTasks = [
    {
      title: 'Design homepage hero section',
      description: 'Create a bold gradient hero with headline, CTA buttons and responsive breakpoints for the landing page.',
      status: 'in-progress',
      priority: 'high',
      due_date: dayOffset(2)
    },
    {
      title: 'Implement REST API endpoints',
      description: 'Build full CRUD routes for tasks with validation, filtering and proper status codes.',
      status: 'done',
      priority: 'medium',
      due_date: dayOffset(-1)
    },
    {
      title: 'Write user authentication module',
      description: 'Add sign-up, sign-in and session handling with hashed passwords.',
      status: 'todo',
      priority: 'high',
      due_date: dayOffset(7)
    },
    {
      title: 'Fix mobile navigation overflow bug',
      description: 'The hamburger menu overflows on screens narrower than 360px. Needs a breakpoint fix.',
      status: 'todo',
      priority: 'medium',
      due_date: dayOffset(-2) // overdue example
    },
    {
      title: 'Prepare Q4 marketing report',
      description: 'Collect campaign metrics and summarize performance for the leadership review.',
      status: 'in-progress',
      priority: 'low',
      due_date: dayOffset(10)
    },
    {
      title: 'Update project documentation',
      description: 'Refresh the README with setup steps, API reference and folder structure.',
      status: 'done',
      priority: 'low',
      due_date: null
    }
  ];

  const insert = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, created_at, updated_at)
    VALUES (@title, @description, @status, @priority, @due_date, @created_at, @updated_at)
  `);

  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => insert.run(row));
  });

  insertMany(seedTasks.map((t) => ({ ...t, created_at: now, updated_at: now })));
  console.log('[db] Seeded 6 sample tasks into a fresh database.');
}

module.exports = db;
