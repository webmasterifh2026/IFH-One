const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * App-wide timestamp format: "dd MMM yyyy HH:mm:ss" (e.g. "10 Jul 2026 14:35:42").
 * Mirrors apps/web/src/lib/procurement-stages.ts#formatDateTime so notification
 * payloads, history descriptions, and reports render identically front and back.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
