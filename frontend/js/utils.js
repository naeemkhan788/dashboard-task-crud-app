/**
 * js/utils.js
 * -----------
 * Tiny generic helpers with no app-specific knowledge.
 */

/**
 * Converts a plain string into a safe HTML string by escaping the five
 * dangerous characters (& < > " '). This prevents user-typed task titles or
 * descriptions from injecting markup/scripts when we render them.
 *
 * @param {string} value raw text (may contain <, >, quotes, …)
 * @returns {string} text that is safe to insert with innerHTML
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Returns a copy of `fn` that waits `delay` ms after its last call before
 * running — used so the search box doesn't fire a request on every keystroke.
 *
 * @param {Function} fn    function to debounce
 * @param {number}   delay milliseconds of silence required
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
