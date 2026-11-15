/**
 * TaskFlow - Validation middleware
 * Every value is trimmed/sanitized and checked against an allow-list.
 * All database access elsewhere uses parameterized queries only.
 */
const STATUSES = ['todo', 'in-progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

function runTaskValidation(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  // title - required for POST and PUT
  if (!partial || body.title !== undefined) {
    const title = cleanText(body.title);
    if (!title) {
      errors.push('Title is required.');
    } else if (title.length > 100) {
      errors.push('Title must be 100 characters or fewer.');
    } else {
      data.title = title;
    }
  }

  // description - optional
  if (body.description !== undefined) {
    data.description = cleanText(body.description);
  }

  // status - enum
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      errors.push(`Status must be one of: ${STATUSES.join(', ')}.`);
    } else {
      data.status = body.status;
    }
  }

  // priority - enum
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) {
      errors.push(`Priority must be one of: ${PRIORITIES.join(', ')}.`);
    } else {
      data.priority = body.priority;
    }
  }

  // due_date - optional, strict YYYY-MM-DD
  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === '') {
      data.due_date = null;
    } else if (typeof body.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) {
      errors.push('due_date must be a string in YYYY-MM-DD format.');
    } else {
      data.due_date = body.due_date;
    }
  }

  return { errors, data };
}

/** Validates :id route params and attaches the numeric id to req.taskId. */
function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid task id. It must be a positive integer.' });
  }
  req.taskId = id;
  next();
}

/** POST /api/tasks and PUT /api/tasks/:id - title is mandatory. */
function validateTask(req, res, next) {
  const { errors, data } = runTaskValidation(req.body || {}, { partial: false });
  if (errors.length) {
    return res.status(400).json({ success: false, message: errors.join(' '), errors });
  }
  req.taskData = data;
  next();
}

/** Partial update validation (kept for future PATCH /api/tasks/:id support). */
function validateTaskPartial(req, res, next) {
  const { errors, data } = runTaskValidation(req.body || {}, { partial: true });
  if (errors.length) {
    return res.status(400).json({ success: false, message: errors.join(' '), errors });
  }
  req.taskData = data;
  next();
}

/** PATCH /api/tasks/:id/status */
function validateStatus(req, res, next) {
  const status = (req.body || {}).status;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}.` });
  }
  next();
}

module.exports = { validateId, validateTask, validateTaskPartial, validateStatus, STATUSES, PRIORITIES };
