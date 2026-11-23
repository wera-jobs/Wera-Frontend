/** The text input look shared by every form. */
export const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-faint transition-colors duration-150 hover:border-accent/40 focus:border-accent/60';

/**
 * The longest entrance delay for list items (anim-rise lasts 220ms), so a
 * list is fully drawn within half a second: anything later reads as lag,
 * and the axe check in e2e samples colours at 600ms.
 */
export const STAGGER_MAX_MS = 240;
