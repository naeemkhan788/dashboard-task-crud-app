/**
 * TaskFlow - Statistic cards renderer (consumes GET /api/stats)
 */
import { icon } from './icons.js';

const CARDS = [
  { key: 'total', label: 'Total Tasks', tone: 'indigo', iconName: 'clipboard' },
  { key: 'todo', label: 'To Do', tone: 'amber', iconName: 'listIcon' },
  { key: 'inProgress', label: 'In Progress', tone: 'blue', iconName: 'loader' },
  { key: 'done', label: 'Done', tone: 'green', iconName: 'checkCircle' }
];

export function renderStats(container, stats) {
  if (!container || !stats) return;

  container.innerHTML = CARDS.map((card) => `
    <article class="stat-card stat-card--${card.tone}">
      <span class="stat-icon">${icon(card.iconName)}</span>
      <div class="stat-info">
        <span class="stat-value">${stats[card.key] ?? 0}</span>
        <span class="stat-label">${card.label}</span>
      </div>
      ${card.key === 'total' && stats.overdue > 0
        ? `<span class="stat-alert" title="Tasks past their due date">${icon('clock')}${stats.overdue} overdue</span>`
        : ''}
    </article>
  `).join('');
}
