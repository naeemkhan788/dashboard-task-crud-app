/**
 * TaskFlow - Dark / light theme toggle (persisted in localStorage).
 * The initial theme is applied pre-paint by an inline script in index.html.
 */
import { icon } from './icons.js';

const KEY = 'taskflow-theme';

function apply(theme, btn) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
  btn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}

export function initTheme(btn) {
  apply(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', btn);
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next, btn);
  });
}
