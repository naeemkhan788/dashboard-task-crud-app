/**
 * TaskFlow - REST API server
 * Express + better-sqlite3. Serves BOTH the static frontend and the /api
 * routes from ONE server so any proxy/preview can reach everything.
 *
 * Default port: 3000 (the port preview proxies expect). Override with PORT.
 *
 * Endpoints:
 *   GET    /api/health            - service health check
 *   GET    /api/stats             - dashboard statistics
 *   GET    /api/tasks             - list tasks (?status=&priority=&search=)
 *   GET    /api/tasks/:id         - single task
 *   POST   /api/tasks             - create task
 *   PUT    /api/tasks/:id         - update task
 *   PATCH  /api/tasks/:id/status  - quick status change (kanban drag & drop)
 *   DELETE /api/tasks/:id         - delete task
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const taskRoutes = require('./routes/taskRoutes');
const taskController = require('./controllers/taskController');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Initialize database (creates schema + seeds sample data on first run)
require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

/* Lightweight request logger */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

/* Health check */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() },
    message: 'TaskFlow API is healthy.'
  });
});

/* Dashboard statistics */
app.get('/api/stats', taskController.getStats);

/* Tasks CRUD */
app.use('/api/tasks', taskRoutes);

/* Serve the frontend so the WHOLE app runs from ONE origin/port
   (default http://localhost:3000). This avoids the file:// problem where
   browsers block ES modules, and lets preview proxies reach /api too. */
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* 404 + global error handling */
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('──────────────────────────────────────────────');
  console.log('  TaskFlow API');
  console.log(`  Base URL     : http://localhost:${PORT}/api`);
  console.log(`  Health check : http://localhost:${PORT}/api/health`);
  console.log('──────────────────────────────────────────────');
});
