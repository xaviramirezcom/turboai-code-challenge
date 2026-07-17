import { describe, expect, it } from 'vitest';

import { formatEditedAt, formatShortDate } from './date';

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

  it('formats a short card date', () => {
    expect(formatShortDate('2024-06-12T09:00:00')).toBe('June 12');
  });
});
