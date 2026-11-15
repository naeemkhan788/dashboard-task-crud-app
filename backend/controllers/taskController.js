/**
 * TaskFlow - Task controllers
 * All SQL is parameterized. Every response follows the shape:
 *   { success: boolean, data?: any, message?: string }
 */
const db = require('../db/database');

const nowISO = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* GET /api/tasks?status=&priority=&search=                            */
/* ------------------------------------------------------------------ */
exports.getAllTasks = (req, res) => {
  const { status, priority, search } = req.query;
  const clauses = [];
  const params = [];

  if (status !== undefined && status !== '') {
    if (!['todo', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter. Use todo, in-progress or done.' });
    }
    clauses.push('status = ?');
    params.push(status);
  }

  if (priority !== undefined && priority !== '') {
    if (!['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority filter. Use low, medium or high.' });
    }
    clauses.push('priority = ?');
    params.push(priority);
  }

  if (search !== undefined && search.trim() !== '') {
    const like = `%${search.trim()}%`;
    clauses.push('(title LIKE ? OR description LIKE ?)');
    params.push(like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT * FROM tasks ${where}
    ORDER BY
      CASE status WHEN 'in-progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
      CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      id DESC
  `).all(...params);

  res.json({ success: true, data: rows });
};

/* ------------------------------------------------------------------ */
/* GET /api/tasks/:id                                                  */
/* ------------------------------------------------------------------ */
exports.getTaskById = (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.taskId);
  if (!task) {
    return res.status(404).json({ success: false, message: `Task with id ${req.taskId} was not found.` });
  }
  res.json({ success: true, data: task });
};

/* ------------------------------------------------------------------ */
/* POST /api/tasks                                                     */
/* ------------------------------------------------------------------ */
exports.createTask = (req, res) => {
  const data = req.taskData;
  const now = nowISO();

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.title,
    data.description !== undefined ? data.description : '',
    data.status !== undefined ? data.status : 'todo',
    data.priority !== undefined ? data.priority : 'medium',
    data.due_date !== undefined ? data.due_date : null,
    now,
    now
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: task, message: 'Task created successfully.' });
};

/* ------------------------------------------------------------------ */
/* PUT /api/tasks/:id                                                  */
/* ------------------------------------------------------------------ */
exports.updateTask = (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.taskId);
  if (!existing) {
    return res.status(404).json({ success: false, message: `Task with id ${req.taskId} was not found.` });
  }

  const data = req.taskData;
  const fields = [];
  const params = [];

  // Field names are fixed literals - no user input is concatenated into SQL.
  for (const key of ['title', 'description', 'status', 'priority', 'due_date']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  fields.push('updated_at = ?');
  params.push(nowISO());
  params.push(req.taskId);

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.taskId);
  res.json({ success: true, data: task, message: 'Task updated successfully.' });
};

/* ------------------------------------------------------------------ */
/* PATCH /api/tasks/:id/status                                         */
/* ------------------------------------------------------------------ */
exports.updateStatus = (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.taskId);
  if (!existing) {
    return res.status(404).json({ success: false, message: `Task with id ${req.taskId} was not found.` });
  }

  db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
    .run(req.body.status, nowISO(), req.taskId);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.taskId);
  res.json({ success: true, data: task, message: `Task moved to "${req.body.status}".` });
};

/* ------------------------------------------------------------------ */
/* DELETE /api/tasks/:id                                               */
/* ------------------------------------------------------------------ */
exports.deleteTask = (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.taskId);
  if (!existing) {
    return res.status(404).json({ success: false, message: `Task with id ${req.taskId} was not found.` });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.taskId);
  res.json({ success: true, data: { id: req.taskId }, message: 'Task deleted successfully.' });
};

/* ------------------------------------------------------------------ */
/* GET /api/stats                                                      */
/* ------------------------------------------------------------------ */
exports.getStats = (req, res) => {
  const row = db.prepare(`
    SELECT
      COUNT(*)                                                              AS total,
      SUM(CASE WHEN status = 'todo'         THEN 1 ELSE 0 END)              AS todo,
      SUM(CASE WHEN status = 'in-progress'  THEN 1 ELSE 0 END)              AS inProgress,
      SUM(CASE WHEN status = 'done'         THEN 1 ELSE 0 END)              AS done,
      SUM(CASE WHEN due_date IS NOT NULL
                AND due_date < ?
                AND status != 'done'       THEN 1 ELSE 0 END)              AS overdue
    FROM tasks
  `).get(todayStr());

  res.json({
    success: true,
    data: {
      total: row.total || 0,
      todo: row.todo || 0,
      inProgress: row.inProgress || 0,
      done: row.done || 0,
      overdue: row.overdue || 0
    }
  });
};
