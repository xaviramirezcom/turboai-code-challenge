/** Design tokens (TS mirror of shared/ui/theme/theme.css) from the Figma frames.

CSS consumers use the custom properties in `shared/ui/theme/theme.css`; this
object is for any values needed in TypeScript. Category colours are from
specs/notes/design.md and used by the board.
*/

export const colors = {
  cream: '#faf1e3',
  heading: '#88642a',
  accent: '#957139',
  ink: '#2b2622',
  // Category palette (board)
  randomThoughts: '#E7A67E',
  school: '#F3DCA0',
  personal: '#8FB8AC',
} as const;
