const FEED_DESKTOP_COLUMN_CHROME_CLASS =
  "md:rounded-t-[24px] md:border-x-2 md:border-t-2 md:border-border md:bg-bg";

export const FEED_DESKTOP_COLUMN_FRAME_CLASS =
  `md:min-h-[calc(100dvh-var(--site-header-sticky-offset)-8rem)] ${FEED_DESKTOP_COLUMN_CHROME_CLASS}`;

export const FEED_DESKTOP_POST_DETAIL_COLUMN_FRAME_CLASS =
  `md:min-h-[calc(100dvh-var(--site-header-sticky-offset,0px)-5rem)] ${FEED_DESKTOP_COLUMN_CHROME_CLASS}`;

/** First item must match frame radius. Square cards paint over parent corners. */
export const FEED_DESKTOP_COLUMN_START_CLASS =
  "md:overflow-hidden md:rounded-t-[24px]";
