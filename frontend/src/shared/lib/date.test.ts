import { describe, expect, it } from 'vitest';

import { formatEditedAt, formatRelativeDate } from './date';

describe('date formatters', () => {
  it('formats the editor last-edited label', () => {
    // covers 2.4 — "July 21, 2024 at 8:39pm"
    expect(formatEditedAt('2024-07-21T20:39:00')).toBe(
      'July 21, 2024 at 8:39pm',
    );
  });

  it('uses 12 for midday/midnight and pads minutes', () => {
    expect(formatEditedAt('2024-01-01T00:05:00')).toBe(
      'January 1, 2024 at 12:05am',
    );
    expect(formatEditedAt('2024-01-01T12:00:00')).toBe(
      'January 1, 2024 at 12:00pm',
    );
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2024-07-21T15:00:00');

  it('shows "today" for a note edited today', () => {
    // covers 4.1
    expect(formatRelativeDate('2024-07-21T09:00:00', now)).toBe('today');
    // boundary: just after local midnight today is still "today"
    expect(formatRelativeDate('2024-07-21T00:01:00', now)).toBe('today');
  });

  it('shows "yesterday" for a note edited yesterday', () => {
    // covers 4.2
    expect(formatRelativeDate('2024-07-20T23:59:00', now)).toBe('yesterday');
  });

  it('shows the month and day (no year) for older notes', () => {
    // covers 4.3
    expect(formatRelativeDate('2024-07-16T12:00:00', now)).toBe('July 16');
    expect(formatRelativeDate('2023-01-05T12:00:00', now)).toBe('January 5');
  });
});
