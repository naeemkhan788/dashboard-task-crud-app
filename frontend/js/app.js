/**
 * TaskFlow - Application entry point.
 * Wires state, API calls, filters, navigation, views and modals together.
 */
import { api } from './api.js';
import { initTheme } from './theme.js';
import { toast } from './toast.js';
import { renderStats } from './stats.js';
import { renderBoard, renderError, showSkeleton } from './board.js';
import {
  initTaskModal,
  openTaskModal,
  closeTaskModal,
  initConfirmModal,
  openConfirmModal,
  closeConfirmModal
} from './modal.js';

const $ = (id) => document.getElementById(id);

const els = {
  sidebar: $('sidebar'),
  sidebarOverlay: $('sidebarOverlay'),
  hamburger: $('hamburgerBtn'),
  sideNav: $('sideNav'),
  search: $('searchInput'),
  themeToggle: $('themeToggle'),
  newTaskBtn: $('newTaskBtn'),
  statsGrid: $('statsGrid'),
  boardArea: $('boardArea'),
  boardTitle: $('boardTitle'),
  taskCount: $('taskCount'),
  priorityChips: $('priorityChips'),
  viewToggle: $('viewToggle')
};

/* Sidebar nav -> filter + view behaviour */
const NAV = {
  dashboard: { status: 'all', view: 'kanban', title: 'Dashboard', reset: true },
  all: { status: 'all', view: 'list', title: 'All Tasks' },
  'in-progress': { status: 'in-progress', view: 'list', title: 'In Progress' },
  done: { status: 'done', view: 'list', title: 'Completed' }
};

const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };

const state = {
  tasks: [],
  view: 'kanban',
  statusFilter: 'all',
  priorityFilter: 'all',
  search: '',
  title: 'Dashboard',
  booted: false
};

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}...` : text);

const debounce = (fn, ms = 350) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  renderBoard(els.boardArea, {
    tasks: state.tasks,
    view: state.view,
    filtered: state.statusFilter !== 'all' || state.priorityFilter !== 'all' || !!state.search,
    handlers
  });
}

function updateMeta() {
  els.taskCount.textContent = `${state.tasks.length} ${state.tasks.length === 1 ? 'task' : 'tasks'}`;
  els.boardTitle.textContent = state.title;
}

function syncViewButtons() {
  els.viewToggle.querySelectorAll('.view-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.view === state.view);
  });
}

function syncChips() {
  els.priorityChips.querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('is-active', c.dataset.priority === state.priorityFilter);
  });
}

function syncNavActive() {
  const key = state.statusFilter === 'in-progress'
    ? 'in-progress'
    : state.statusFilter === 'done'
      ? 'done'
      : (state.view === 'list' ? 'all' : 'dashboard');
  els.sideNav.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.filter === key);
  });
}

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

async function load({ silent = false } = {}) {
  if (!silent) showSkeleton(els.boardArea);
  else els.boardArea.classList.add('is-refreshing');

  try {
    const [tasks, stats] = await Promise.all([
      api.getTasks({ status: state.statusFilter, priority: state.priorityFilter, search: state.search }),
      api.getStats()
    ]);
    state.tasks = tasks;
    renderStats(els.statsGrid, stats);
    render();
    updateMeta();
  } catch (err) {
    renderError(els.boardArea, err.message, handlers);
    toast.error(err.message);
  } finally {
    els.boardArea.classList.remove('is-refreshing');
  }
}

/* ------------------------------------------------------------------ */
/* Handlers passed down to the board renderer                          */
/* ------------------------------------------------------------------ */

const handlers = {
  onEdit: (id) => {
    const task = state.tasks.find((t) => t.id === id);
    if (task) openTaskModal(task);
  },

  onDelete: (id) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    openConfirmModal({
      title: 'Delete this task?',
      message: `"${truncate(task.title, 60)}" will be permanently removed. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.deleteTask(id);
          toast.success('Task deleted successfully.');
          await load({ silent: true });
        } catch (err) {
          toast.error(err.message);
        }
      }
    });
  },

  onNew: () => openTaskModal(null),

  onStatusChange: async (id, status) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    try {
      await api.updateStatus(id, status);
      toast.success(`"${truncate(task.title, 32)}" moved to ${STATUS_LABELS[status] ?? status}.`);
      await load({ silent: true });
    } catch (err) {
      toast.error(err.message);
      await load({ silent: true });
    }
  },

  onRetry: () => load()
};

/* ------------------------------------------------------------------ */
/* Event wiring                                                        */
/* ------------------------------------------------------------------ */

function openSidebar() {
  els.sidebar.classList.add('is-open');
  els.sidebarOverlay.hidden = false;
}

function closeSidebar() {
  els.sidebar.classList.remove('is-open');
  els.sidebarOverlay.hidden = true;
}

function applyNav(key) {
  const conf = NAV[key];
  if (!conf) return;
  state.statusFilter = conf.status;
  state.view = conf.view;
  state.title = conf.title;
  if (conf.reset) {
    state.search = '';
    state.priorityFilter = 'all';
    els.search.value = '';
    syncChips();
  }
  syncViewButtons();
  syncNavActive();
  load({ silent: state.booted });
}

function setView(view) {
  if (state.view === view) return;
  state.view = view;
  syncViewButtons();
  syncNavActive();
  render();
}

function initEvents() {
  initTheme(els.themeToggle);

  els.newTaskBtn.addEventListener('click', () => openTaskModal(null));

  els.sideNav.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link');
    if (!link) return;
    e.preventDefault();
    applyNav(link.dataset.filter);
    closeSidebar();
  });

  els.viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-btn');
    if (btn) setView(btn.dataset.view);
  });

  els.priorityChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.priorityFilter = chip.dataset.priority;
    syncChips();
    load({ silent: state.booted });
  });

  els.search.addEventListener('input', debounce(() => {
    state.search = els.search.value.trim();
    load({ silent: state.booted });
  }));

  els.hamburger.addEventListener('click', openSidebar);
  els.sidebarOverlay.addEventListener('click', closeSidebar);

  initTaskModal({ onSaved: () => load({ silent: true }) });
  initConfirmModal();

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeConfirmModal();
    closeTaskModal();
    closeSidebar();
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

initEvents();
load().then(() => {
  state.booted = true;
});
