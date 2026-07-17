/** Convert a #RRGGBB hex to an rgba() string at the given alpha.

The category colour is stored solid; the card and editor backgrounds render it
at 50% alpha with a solid border (Figma card/editor spec, criterion 3.3).
*/
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
