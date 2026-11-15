# TaskFlow - Interactive Dynamic Task Dashboard

A complete, production-quality full-stack task dashboard with full CRUD support.
The backend is a clean Express REST API backed by SQLite; the frontend is pure
HTML, CSS and vanilla JavaScript (ES modules) - **no Next.js, React, Tailwind
or any other framework**.

![Stack](https://img.shields.io/badge/backend-Express%20%2B%20SQLite-4f46e5) ![Frontend](https://img.shields.io/badge/frontend-Vanilla%20JS%20%2B%20CSS-7c3aed)

## Features

- **Full CRUD** - create, read, update and delete tasks with server-side validation
- **Two views** - a drag & drop Kanban board and a sortable list view
- **Drag & drop status changes** - drop a card into another column and the status
  is persisted instantly via `PATCH /api/tasks/:id/status`
- **Live search** (debounced) plus status and priority filters, all executed
  server-side through query parameters
- **Dashboard statistics** - total, to-do, in-progress, done and overdue counts
- **Polished UI** - indigo gradient design system, glassmorphism topbar,
  animated modals/toasts/skeleton loaders, priority badges, overdue highlighting
- **Dark mode** - persisted in `localStorage`, applied before first paint
- **Responsive** - off-canvas sidebar on tablets/phones, 4 -> 2 -> 1 column stats,
  single-column board on mobile, no horizontal scrolling
- **Accessible** - ARIA roles/labels, focus-visible rings, Escape closes dialogs,
  keyboard operable cards, `prefers-reduced-motion` support

## Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Backend  | Node.js, Express 4                                |
| Database | SQLite via better-sqlite3 (file: `data/tasks.db`) |
| Frontend | HTML5, CSS3 (custom properties, grid, animations), Vanilla JS (ES modules) |

## Project Structure

```
task-dashboard/
├── backend/
│   ├── server.js                 # Express app: static frontend + API on ONE port (3000)
│   ├── package.json
│   ├── db/
│   │   └── database.js           # SQLite connection, schema, seed data (6 tasks)
│   ├── controllers/
│   │   └── taskController.js     # All task handlers (parameterized SQL only)
│   ├── routes/
│   │   └── taskRoutes.js         # /api/tasks router
│   ├── middleware/
│   │   ├── validate.js           # Input validation & sanitization
│   │   └── errorHandler.js       # 404 + global error handler
│   └── data/                     # tasks.db (auto-created, git-ignored)
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css             # Design tokens + full UI (dark mode, responsive)
    └── js/
        ├── app.js                # Entry point: state, events, data loading
        ├── api.js                # fetch wrapper for the REST API
        ├── board.js              # Kanban/list rendering + drag & drop
        ├── modal.js              # Create/edit modal + delete confirmation
        ├── stats.js              # Statistic cards
        ├── toast.js              # Toast notifications
        ├── theme.js              # Dark/light toggle (localStorage)
        └── icons.js              # Inline SVG icon set
```

## Getting Started

### 1. Start the backend

```bash
cd backend
npm install
npm start          # serves the UI + API on port 3000 (override with PORT)
```

> Running from the repository root instead? `npm start` there is wired as the
> project's auto-start command and launches this exact server.

The API is now live at `http://localhost:3000/api` and the SQLite database
(`backend/data/tasks.db`) is created and seeded with 6 sample tasks on first run.

### 2. Open the frontend

**Easiest - the backend already serves it.** Just open:

> <http://localhost:3000>

The API and the UI share the same origin, so there are no CORS or `file://`
issues at all. (`server.js` serves the `frontend/` folder via `express.static`,
and `API_BASE` in `frontend/js/api.js` is the relative path `/api`, so requests
work behind any host, domain or preview proxy.)

Alternatives, if you prefer a separate dev server (handy for frontend hot work):

- **VS Code Live Server**: right-click `frontend/index.html` -> "Open with Live Server", or
- **Python**: `cd frontend && python3 -m http.server 3000` -> open <http://localhost:3000>, or
- **Node**: `npx serve frontend`

> Note: do **not** double-click `index.html` to open it from disk. ES modules
> are blocked on `file://` URLs, so no JavaScript would run and creating a task
> would silently fail. Always use one of the HTTP options above.

## API Reference

Base URL: `/api` - relative, same origin as the UI (locally: `http://localhost:3000/api`). All responses use JSON with the shape
`{ "success": boolean, "data": ..., "message": ... }`.

| Method | Endpoint               | Description                                                     | Success |
| ------ | ---------------------- | --------------------------------------------------------------- | ------- |
| GET    | `/health`              | Service health check                                            | 200 |
| GET    | `/stats`               | `{ total, todo, inProgress, done, overdue }`                    | 200 |
| GET    | `/tasks`               | List tasks. Filters: `?status=todo|in-progress|done`, `?priority=low|medium|high`, `?search=text` | 200 |
| GET    | `/tasks/:id`           | Single task                                                     | 200 / 404 |
| POST   | `/tasks`               | Create task                                                     | 201 / 400 |
| PUT    | `/tasks/:id`           | Update task (title required)                                    | 200 / 400 / 404 |
| PATCH  | `/tasks/:id/status`    | Quick status change `{ "status": "..." }`                       | 200 / 400 / 404 |
| DELETE | `/tasks/:id`           | Delete task                                                     | 200 / 404 |

### Task model

| Field         | Type   | Rules                                                  |
| ------------- | ------ | ------------------------------------------------------ |
| `title`       | string | Required, max 100 chars                                |
| `description` | string | Optional                                               |
| `status`      | string | `todo` \| `in-progress` \| `done` (default `todo`)     |
| `priority`    | string | `low` \| `medium` \| `high` (default `medium`)         |
| `due_date`    | string | Optional, `YYYY-MM-DD`                                 |
| `created_at` / `updated_at` | ISO timestamp | Managed by the server |

### Example

```bash
# Create
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship the release","priority":"high","due_date":"2026-12-01"}'

# Filter + search
curl "http://localhost:3000/api/tasks?status=todo&priority=high&search=release"

# Move between kanban columns
curl -X PATCH http://localhost:3000/api/tasks/1/status \
  -H "Content-Type: application/json" -d '{"status":"done"}'

# Delete
curl -X DELETE http://localhost:3000/api/tasks/1
```

## Security Notes

- 100% parameterized SQL - no string-concatenated queries, so SQL injection is not possible
- All input is trimmed and validated server-side against allow-lists (status/priority enums, `YYYY-MM-DD` dates)
- All user-provided text is HTML-escaped before rendering (XSS-safe frontend)
- CORS is enabled for local development; JSON body size is limited to 100kb

## Troubleshooting

| Symptom | Cause & fix |
| ------- | ----------- |
| "Cannot reach the server" toast / network errors in the browser | The backend is not running. Start it with `cd backend && npm start`. |
| **502 Bad Gateway** in a preview/proxy environment | The proxy forwards to a port where nothing is listening. TaskFlow listens on port **3000** by default (the standard preview port) and serves the UI + `/api` from that single origin. Start the server with `npm start` and keep the proxy pointed at the same port (`PORT` env var to change it). The frontend calls the relative `/api` path, so no hostname rewrites are needed. |
| `EADDRINUSE: port 3000` | Another process owns port 3000. Start with `PORT=3001 npm start` and open http://localhost:3001 - no code changes needed, the frontend calls the relative `/api` path. |
| Search/filters do nothing | Check the browser console; the API must be reachable at `http://localhost:3000/api`. |
| `better-sqlite3` install fails | Ensure Node.js 18+ and build tools are available, or delete `node_modules` and reinstall. |
