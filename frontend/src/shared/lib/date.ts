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

/** Short date for a note card header, e.g. "July 21". Board refines this to
 * relative "today/yesterday" (board spec, Requirement 4). */
export function formatShortDate(iso: string): string {
  const { month, day } = parts(iso);
  return `${month} ${day}`;
}
