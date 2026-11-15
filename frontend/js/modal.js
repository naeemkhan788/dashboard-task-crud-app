/**
 * TaskFlow - Modal controllers (create/edit task + delete confirmation)
 */
import { api } from './api.js';
import { toast } from './toast.js';
import { icon } from './icons.js';

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ */
/* Task create / edit modal                                            */
/* ------------------------------------------------------------------ */

let onSaved = null;
let editing = null;
const els = {};

export function initTaskModal({ onSaved: savedCallback }) {
  onSaved = savedCallback;

  Object.assign(els, {
    overlay: $('taskModal'),
    title: $('taskModalTitle'),
    subtitle: $('taskModalSubtitle'),
    form: $('taskForm'),
    taskId: $('taskId'),
    titleInput: $('taskTitle'),
    descInput: $('taskDescription'),
    dueInput: $('taskDueDate'),
    saveBtn: $('taskModalSave'),
    error: $('titleError')
  });

  $('taskModalClose').addEventListener('click', closeTaskModal);
  $('taskModalCancel').addEventListener('click', closeTaskModal);
  els.overlay.addEventListener('mousedown', (e) => {
    if (e.target === els.overlay) closeTaskModal();
  });
  els.titleInput.addEventListener('input', clearError);
  els.form.addEventListener('submit', handleSubmit);
}

export function openTaskModal(task = null) {
  editing = task;

  els.title.textContent = task ? 'Edit Task' : 'Create a New Task';
  els.subtitle.textContent = task
    ? 'Update the details below and save your changes.'
    : 'Add the details below and drop it onto your board.';
  els.taskId.value = task ? task.id : '';
  els.titleInput.value = task ? task.title : '';
  els.descInput.value = task?.description ?? '';
  els.dueInput.value = task?.due_date ?? '';

  const status = els.form.querySelector(`input[name="status"][value="${task?.status ?? 'todo'}"]`);
  const priority = els.form.querySelector(`input[name="priority"][value="${task?.priority ?? 'medium'}"]`);
  if (status) status.checked = true;
  if (priority) priority.checked = true;

  clearError();
  els.saveBtn.innerHTML = `${icon(task ? 'check' : 'plus')}<span>${task ? 'Save Changes' : 'Create Task'}</span>`;

  els.overlay.hidden = false;
  document.body.classList.add('no-scroll');
  setTimeout(() => els.titleInput.focus(), 80);
}

export function closeTaskModal() {
  if (!els.overlay || els.overlay.hidden) return;
  els.overlay.classList.add('is-closing');
  setTimeout(() => {
    els.overlay.classList.remove('is-closing');
    els.overlay.hidden = true;
    releaseScroll();
  }, 180);
}

function showError(message) {
  els.error.textContent = message;
  els.error.hidden = false;
  els.titleInput.classList.add('input-error');
  els.titleInput.focus();
}

function clearError() {
  els.error.hidden = true;
  els.titleInput.classList.remove('input-error');
}

function releaseScroll() {
  if (!document.querySelector('.modal-overlay:not([hidden])')) {
    document.body.classList.remove('no-scroll');
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const title = els.titleInput.value.trim();
  if (!title) return showError('Title is required.');

  const payload = {
    title,
    description: els.descInput.value.trim(),
    status: els.form.querySelector('input[name="status"]:checked')?.value ?? 'todo',
    priority: els.form.querySelector('input[name="priority"]:checked')?.value ?? 'medium',
    due_date: els.dueInput.value || null
  };

  els.saveBtn.disabled = true;
  try {
    if (editing) {
      await api.updateTask(Number(els.taskId.value), payload);
      toast.success('Task updated successfully.');
    } else {
      await api.createTask(payload);
      toast.success('Task created successfully.');
    }
    closeTaskModal();
    onSaved?.();
  } catch (err) {
    toast.error(err.message);
  } finally {
    els.saveBtn.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Confirm delete modal                                                */
/* ------------------------------------------------------------------ */

let confirmCallback = null;
const confirmEls = {};

export function initConfirmModal() {
  Object.assign(confirmEls, {
    overlay: $('confirmModal'),
    title: $('confirmTitle'),
    message: $('confirmMessage')
  });

  $('confirmCancel').addEventListener('click', closeConfirmModal);
  $('confirmDelete').addEventListener('click', async () => {
    const cb = confirmCallback;
    closeConfirmModal();
    await cb?.();
  });
  confirmEls.overlay.addEventListener('mousedown', (e) => {
    if (e.target === confirmEls.overlay) closeConfirmModal();
  });
}

export function openConfirmModal({ title = 'Are you sure?', message = '', onConfirm }) {
  confirmCallback = onConfirm;
  confirmEls.title.textContent = title;
  confirmEls.message.textContent = message;
  confirmEls.overlay.hidden = false;
  document.body.classList.add('no-scroll');
}

export function closeConfirmModal() {
  if (confirmEls.overlay.hidden) return;
  confirmEls.overlay.classList.add('is-closing');
  setTimeout(() => {
    confirmEls.overlay.classList.remove('is-closing');
    confirmEls.overlay.hidden = true;
    releaseScroll();
  }, 180);
}
