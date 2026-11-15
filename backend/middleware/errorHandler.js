/**
 * TaskFlow - Centralized error handling
 * 404 for unknown routes + global error handler (JSON parse errors -> 400).
 */

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.message);

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }

  // Body larger than the configured limit
  if (err.type === 'entity.too.large') {
    return res.status(400).json({ success: false, message: 'Request body is too large.' });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error. Please try again later.'
  });
}

module.exports = { notFoundHandler, errorHandler };
