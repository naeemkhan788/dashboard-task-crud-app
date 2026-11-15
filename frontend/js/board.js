/**
 * TaskFlow - Board rendering: kanban columns (with drag & drop), list view,
 * skeleton loaders, empty and error states.
 */
import { icon } from './icons.js';

const STATUSES = [
  { status: 'todo', label: 'To Do' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'done', label: 'Done' }
];

const STATUS_LABELS = Object.fromEntries(STATUSES.map((s) => [s.status, s.label]));

/* Escape user-provided text before injecting into innerHTML (XSS-safe). */
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function isOverdue(task) {
  return task.status !== 'done' && !!task.due_date && task.due_date < todayStr();
}

function formatDue(task) {
  const date = new Date(`${task.due_date}T00:00:00`);
  const opts = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('en-US', opts);
}

const priorityBadge = (p) => `<span class="badge badge--${esc(p)}">${esc(p)}</span>`;

const statusPill = (s) => `<span class="pill pill--${esc(s)}">${esc(STATUS_LABELS[s] ?? s)}</span>`;

const dueHtml = (task, forList = false) => {
  if (!task.due_date) {
    return forList
      ? '<span class="due due--muted">&mdash;</span>'
      : '<span class="due due--muted">No due date</span>';
  }
  const overdue = isOverdue(task);
  const label = overdue ? `Overdue &middot; ${formatDue(task)}` : formatDue(task);
  return `<span class="due ${overdue ? 'is-overdue' : ''}">${icon(overdue ? 'clock' : 'calendar')}<span>${label}</span></span>`;
};

const actionButtons = (id) => `
  <span class="task-card__actions">
    <button class="icon-btn icon-btn--xs js-edit" data-id="${id}" aria-label="Edit task" title="Edit">${icon('pencil')}</button>
    <button class="icon-btn icon-btn--xs icon-btn--danger js-delete" data-id="${id}" aria-label="Delete task" title="Delete">${icon('trash')}</button>
  </span>`;

function taskCard(task, index) {
  const doneClass = task.status === 'done' ? ' is-done' : '';
  return `
    <article class="task-card${doneClass}" draggable="true" data-id="${task.id}" style="--i:${index}" tabindex="0">
      <div class="task-card__top">
        <h3 class="task-card__title">${esc(task.title)}</h3>
      </div>
      ${task.description ? `<p class="task-card__desc">${esc(task.description)}</p>` : ''}
      <div class="task-card__badges">${priorityBadge(task.priority)}</div>
      <div class="task-card__meta">
        ${dueHtml(task)}
        ${actionButtons(task.id)}
      </div>
    </article>`;
}

/* ------------------------------------------------------------------ */
/* Kanban view                                                         */
/* ------------------------------------------------------------------ */

function renderKanban(area, tasks) {
  const groups = Object.fromEntries(STATUSES.map((s) => [s.status, []]));
  tasks.forEach((t) => {
    if (groups[t.status]) groups[t.status].push(t);
  });

  let index = 0;
  area.innerHTML = `<div class="kanban">${STATUSES.map((col) => `
    <section class="kanban-column" data-status="${col.status}" aria-label="${col.label} column">
      <header class="column-head">
        <span class="column-dot column-dot--${col.status}"></span>
        <h2 class="column-title">${col.label}</h2>
        <span class="column-count">${groups[col.status].length}</span>
      </header>
      <div class="column-body">
        ${groups[col.status].length
          ? groups[col.status].map((t) => taskCard(t, index++)).join('')
          : '<div class="column-empty">No tasks here yet</div>'}
      </div>
    </section>`).join('')}</div>`;

  wireDragAndDrop(area);
}

/* Drag & drop is wired once per container via a WeakSet to avoid duplicates. */
const wiredAreas = new WeakSet();

function wireDragAndDrop(area) {
  if (wiredAreas.has(area)) return;
  wiredAreas.add(area);

  let draggedId = null;

  area.addEventListener('dragstart', (e) => {
    const card = e.target.closest ? e.target.closest('.task-card') : null;
    if (!card) return;
    draggedId = Number(card.dataset.id);
    card.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(draggedId));
  });

  area.addEventListener('dragend', (e) => {
    if (e.target.closest) e.target.closest('.task-card')?.classList.remove('is-dragging');
    area.querySelectorAll('.kanban-column.is-dragover').forEach((c) => c.classList.remove('is-dragover'));
    draggedId = null;
  });

  area.addEventListener('dragover', (e) => {
    const col = e.target.closest ? e.target.closest('.kanban-column') : null;
    if (!col) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('is-dragover');
  });

  area.addEventListener('dragleave', (e) => {
    const col = e.target.closest ? e.target.closest('.kanban-column') : null;
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('is-dragover');
  });

  area.addEventListener('drop', (e) => {
    const col = e.target.closest ? e.target.closest('.kanban-column') : null;
    if (!col) return;
    e.preventDefault();
    col.classList.remove('is-dragover');
    const id = Number(e.dataTransfer.getData('text/plain')) || draggedId;
    if (id) area.__onStatusChange?.(id, col.dataset.status);
  });
}

/* ------------------------------------------------------------------ */
/* List view                                                           */
/* ------------------------------------------------------------------ */

function renderList(area, tasks) {
  area.innerHTML = `
    <div class="list-view" role="table" aria-label="Task list">
      <div class="list-head" role="row">
        <span>Task</span><span>Status</span><span>Priority</span><span>Due date</span><span class="list-head__actions">Actions</span>
      </div>
      ${tasks.map((t, i) => `
        <div class="list-row" role="row" style="--i:${i}">
          <div class="list-task" role="cell">
            <span class="list-task__title ${t.status === 'done' ? 'is-done' : ''}">${esc(t.title)}</span>
            ${t.description ? `<span class="list-task__desc">${esc(t.description)}</span>` : ''}
          </div>
          <div class="list-cell" role="cell">${statusPill(t.status)}</div>
          <div class="list-cell" role="cell">${priorityBadge(t.priority)}</div>
          <div class="list-cell" role="cell">${dueHtml(t, true)}</div>
          <div class="list-actions" role="cell">
            <button class="icon-btn icon-btn--xs js-edit" data-id="${t.id}" aria-label="Edit task" title="Edit">${icon('pencil')}</button>
            <button class="icon-btn icon-btn--xs icon-btn--danger js-delete" data-id="${t.id}" aria-label="Delete task" title="Delete">${icon('trash')}</button>
          </div>
        </div>`).join('')}
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Empty & error states                                                */
/* ------------------------------------------------------------------ */

function renderEmpty(area, filtered, handlers) {
  area.innerHTML = `
    <div class="state-block">
      <div class="state-icon">${icon('clipboard')}</div>
      <h3>${filtered ? 'No tasks match your filters' : 'No tasks yet'}</h3>
      <p>${filtered
        ? 'Try a different search term, status or priority filter - or create a new task.'
        : 'Your board is empty. Create your first task to get started.'}</p>
      <button class="btn btn--primary js-new">${icon('plus')}<span>New Task</span></button>
    </div>`;
  handlers.onNew = handlers.onNew;
}

export function renderError(area, message, handlers) {
  area.innerHTML = `
    <div class="state-block state-error">
      <div class="state-icon">${icon('alertCircle')}</div>
      <h3>Could not load tasks</h3>
      <p>${esc(message)}</p>
      <button class="btn btn--primary js-retry">${icon('loader')}<span>Try Again</span></button>
    </div>`;
  handlers.onError = handlers.onError;
}

/* ------------------------------------------------------------------ */
/* Skeleton loader                                                     */
/* ------------------------------------------------------------------ */

export function showSkeleton(area) {
  const col = (heights) => `
    <section class="kanban-column">
      <div class="skel skel-col-head"></div>
      <div class="column-body">
        ${heights.map((h) => `<div class="skel skel-card" style="height:${h}px"></div>`).join('')}
      </div>
    </section>`;

  area.innerHTML = `<div class="kanban">${col([96, 78])}${col([88, 96, 70])}${col([96, 88])}</div>`;
}

/* ------------------------------------------------------------------ */
/* Dispatcher + delegated click handling                               */
/* ------------------------------------------------------------------ */

export function renderBoard(area, { tasks, view, filtered, handlers }) {
  // One delegated click handler for edit / delete / new / retry buttons.
  area.onclick = (e) => {
    const editBtn = e.target.closest('.js-edit');
    if (editBtn) return handlers.onEdit(Number(editBtn.dataset.id));
    const delBtn = e.target.closest('.js-delete');
    if (delBtn) return handlers.onDelete(Number(delBtn.dataset.id));
    if (e.target.closest('.js-new')) return handlers.onNew?.();
    if (e.target.closest('.js-retry')) return handlers.onRetry?.();
  };

  // Enter key on a focused card opens it for editing (keyboard a11y).
  area.onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('task-card')) {
      handlers.onEdit(Number(e.target.dataset.id));
    }
  };

  area.__onStatusChange = handlers.onStatusChange;

  if (!tasks.length) {
    renderEmpty(area, filtered, handlers);
    return;
  }
  if (view === 'list') renderList(area, tasks);
  else renderKanban(area, tasks);
}
