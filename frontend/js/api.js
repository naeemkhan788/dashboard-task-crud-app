/**
 * TaskFlow - API client
 * Uses a RELATIVE base path (/api) so requests are always same-origin with
 * whatever host serves the frontend (localhost, a preview domain, a proxy).
 * Resolves with the `data` payload directly; throws readable Error objects.
 */

const API_BASE = '/api';

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running (npm start).');
  }

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    /* empty response body - fall through */
  }

  if (!res.ok) {
    throw new Error(payload.message || `Request failed with status ${res.status}.`);
  }
  return payload.data;
}

const toQuery = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== 'all') p.set(key, value);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  getTasks: (filters = {}) => request(`/tasks${toQuery(filters)}`),
  getStats: () => request('/stats'),
  createTask: (data) => request('/tasks', { method: 'POST', body: data }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: data }),
  updateStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' })
};
