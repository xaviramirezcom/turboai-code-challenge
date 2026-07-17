const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parts(iso: string): {
  d: Date;
  month: string;
  day: number;
  year: number;
} {
  const d = new Date(iso);
  return {
    d,
    month: MONTHS[d.getMonth()] ?? '',
    day: d.getDate(),
    year: d.getFullYear(),
  };
}

/** Editor last-edited label (criterion 2.4): "July 21, 2024 at 8:39pm". */
export function formatEditedAt(iso: string): string {
  const { d, month, day, year } = parts(iso);
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'pm' : 'am';
  let hours = d.getHours() % 12;
  if (hours === 0) hours = 12;
  return `${month} ${day}, ${year} at ${hours}:${minutes}${ampm}`;
}

/** Note card date (board Requirement 4), user-local:
 * today → "today"; yesterday → "yesterday"; older → "July 16" (no year). */
export function formatRelativeDate(
  iso: string,
  now: Date = new Date(),
): string {
  const { d, month, day } = parts(iso);
  const startOfDay = (x: Date): number =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return `${month} ${day}`;
}
