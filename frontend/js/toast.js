/**
 * TaskFlow - Toast notifications
 * Usage: toast.success('Saved'), toast.error('Oops'), toast.info('FYI')
 */
import { icon } from './icons.js';

const TOAST_ICONS = { success: 'checkCircle', error: 'alertCircle', info: 'info' };

function show(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="toast__icon">${icon(TOAST_ICONS[type])}</span>
    <span class="toast__msg"></span>
    <button class="toast__close" aria-label="Dismiss notification">${icon('x')}</button>
  `;
  el.querySelector('.toast__msg').textContent = message;

  container.appendChild(el);

  const close = () => {
    if (el.dataset.leaving) return;
    el.dataset.leaving = '1';
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };

  const timer = setTimeout(close, 3800);
  el.querySelector('.toast__close').addEventListener('click', () => {
    clearTimeout(timer);
    close();
  });
}

export const toast = {
  success: (m) => show(m, 'success'),
  error: (m) => show(m, 'error'),
  info: (m) => show(m, 'info')
};
