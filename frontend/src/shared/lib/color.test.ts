import { describe, expect, it } from 'vitest';

import { withAlpha } from './color';

describe('withAlpha', () => {
  it('converts a hex colour to rgba at the given alpha', () => {
    // covers 3.3 — card/editor background is the category colour at 50%
    expect(withAlpha('#EF9C66', 0.5)).toBe('rgba(239, 156, 102, 0.5)');
    expect(withAlpha('#78ABA8', 0.5)).toBe('rgba(120, 171, 168, 0.5)');
  });
});
