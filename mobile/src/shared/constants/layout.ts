/** Shared contract for the custom tab bar and navigation-safe modal bounds. */
export const TAB_CONTENT_HEIGHT = 64;
export const MIN_TAB_BOTTOM_PADDING = 10;
export const bottomNavigationHeight = (safeBottom: number) =>
  TAB_CONTENT_HEIGHT + Math.max(safeBottom, MIN_TAB_BOTTOM_PADDING);
