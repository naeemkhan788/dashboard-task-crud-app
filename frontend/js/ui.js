/**
 * js/ui.js
 * --------
 * Presentation helpers shared by the app:
 *   • safe HTML rendering (escape user content → no XSS)
 *   • date formatting + overdue detection
 *   • task card / skeleton HTML templates
 *   • toast notifications
 */

import { escapeHtml } from './utils.js';

// ── Labels used by badges and selects ─────────────────────────────────────
export const STATUS_LABELS = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

// ── Dates ─────────────────────────────────────────────────────────────────
/** 'YYYY-MM-DD' (today, in the user's local time). */
export function todayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** '2026-11-20' → 'Nov 20, 2026'. Returns '' for missing dates. */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A task is overdue when it has a due date in the past and is not done. */
export function isOverdue(task) {
  return Boolean(task.due_date) && task.status !== 'done' && task.due_date < todayISO();
}

// ── Icons (inline SVG strings used inside rendered cards) ─────────────────
// Default presentation attributes make the icons inherit their colour from
// the surrounding CSS (stroke: currentColor).
const svg = (paths, extra = '') =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

export const ICONS = {
  calendar: svg('<rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  trash: svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>'),
  check: svg('<path d="M20 6L9 17l-5-5" stroke-width="2.4"/>'),
  error: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/>'),
};

// ── Templates ─────────────────────────────────────────────────────────────
function badgeHTML(task) {
  const priority = `
    <span class="badge badge-priority-${task.priority}">
      <span class="priority-dot"></span>${PRIORITY_LABELS[task.priority]}
    </span>`;
  const status = `
    <span class="badge badge-status-${task.status}">${STATUS_LABELS[task.status]}</span>`;
  return priority + status;
}

function dueDateHTML(task) {
  if (!task.due_date) return '';
  const overdue = isOverdue(task);
  return `
    <span class="task-meta ${overdue ? 'overdue' : ''}">
      ${ICONS.calendar}
      <span>Due ${formatDate(task.due_date)}</span>
      ${overdue ? '<span class="overdue-flag">Overdue</span>' : ''}
    </span>`;
}

/**
 * Full task card (used in the list grid). Every dynamic value goes through
 * escapeHtml() so user-provided text can never inject markup.
 * data-* attributes power the single delegated click/change handler in app.js.
 */
export function taskCardHTML(task) {
  const title = escapeHtml(task.title);
  const description = escapeHtml(task.description || '');

  return `
    <article class="task-card ${task.status === 'done' ? 'done-card' : ''}" data-id="${task.id}">
      <div class="task-card-top">
        <h3 class="task-title">${title}</h3>
      </div>
      ${description ? `<p class="task-desc">${description}</p>` : ''}
      <div class="task-badges">${badgeHTML(task)}</div>
      ${dueDateHTML(task)}
      <footer class="task-card-footer">
        <select class="status-select" data-action="change-status" aria-label="Change status of ${title}">
          ${Object.entries(STATUS_LABELS)
            .map(
              ([value, label]) =>
                `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`
            )
            .join('')}
        </select>
        <div class="card-actions">
          <button class="card-action-btn" type="button" data-action="edit" data-id="${task.id}" aria-label="Edit task: ${title}" title="Edit">
            ${ICONS.edit}
          </button>
          <button class="card-action-btn danger" type="button" data-action="delete" data-id="${task.id}" aria-label="Delete task: ${title}" title="Delete">
            ${ICONS.trash}
          </button>
        </div>
      </footer>
    </article>`;
}

/** Board view card — same markup as the list card (keeps both views consistent). */
export function boardCardHTML(task) {
  const title = escapeHtml(task.title);
  const description = escapeHtml(task.description || '');

  return `
    <article class="task-card ${task.status === 'done' ? 'done-card' : ''}" data-id="${task.id}">
      <div class="task-card-top">
        <h3 class="task-title">${title}</h3>
      </div>
      ${description ? `<p class="task-desc">${description}</p>` : ''}
      <div class="task-badges">${badgeHTML(task)}</div>
      ${dueDateHTML(task)}
      <footer class="task-card-footer">
        <select class="status-select" data-action="change-status" aria-label="Change status of ${title}">
          ${Object.entries(STATUS_LABELS)
            .map(
              ([value, label]) =>
                `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`
            )
            .join('')}
        </select>
        <div class="card-actions">
          <button class="card-action-btn" type="button" data-action="edit" data-id="${task.id}" aria-label="Edit task: ${title}" title="Edit">
            ${ICONS.edit}
          </button>
          <button class="card-action-btn danger" type="button" data-action="delete" data-id="${task.id}" aria-label="Delete task: ${title}" title="Delete">
            ${ICONS.trash}
          </button>
        </div>
      </footer>
    </article>`;
}

/** One shimmering placeholder card. */
const skeletonCard = '<div class="skeleton-card"></div>';

/** Shows `count` skeleton cards in the given container while loading. */
export function showSkeletons(container, count = 6) {
  container.innerHTML = skeletonCard.repeat(count);
}

// ── Toast notifications ───────────────────────────────────────────────────
/**
 * Shows a temporary toast message.
 * @param {'success'|'error'} type  visual style + icon
 * @param {string} message          what to tell the user
 * @param {number} duration         ms before auto-dismiss
 */
export function showToast(type, message, duration = 3500) {
  const container = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? ICONS.check : ICONS.error}</span>
    <span>${escapeHtml(message)}</span>
    <button class="toast-close" type="button" aria-label="Dismiss notification">${svgClose()}</button>
  `;

  const dismiss = () => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  container.appendChild(toast);

  // Auto-dismiss after the given duration.
  setTimeout(dismiss, duration);
}

function svgClose() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
}
