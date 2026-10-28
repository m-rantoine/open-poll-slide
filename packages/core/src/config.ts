import type { Locale } from './locale/types';

export type OpenSlideBuildConfig = {
  showSlideBrowser?: boolean;
  showSlideUi?: boolean;
  allowHtmlDownload?: boolean;
};

export type OpenSlideLiveConfig = {
  supabaseUrl: string;
  /** Publishable (anon) key; safe to ship to the browser. */
  supabaseKey: string;
  /** Shown on the sign-up form; enforcement lives in the database hook. */
  allowedEmailDomains?: string[];
  /**
   * Tells sites that share one database apart, for example one per course. Sessions started here
   * carry it, and this site lists and joins only its own. Letters, digits, dots, dashes and
   * underscores, up to 40 characters. Can also be set with `OPEN_SLIDE_SITE_LABEL`.
   */
  siteLabel?: string;
};

export type OpenSlideAgentConfig = {
  enabled?: boolean;
};

export type OpenSlideConfig = {
  base?: string;
  slidesDir?: string;
  themesDir?: string;
  assetsDir?: string;
  port?: number;
  allowedHosts?: string[] | true;
  /**
   * @deprecated Pick the UI language from the language switcher in the slide UI
   * instead. When set, this only seeds the initial language until the user
   * chooses one (their choice is then remembered locally).
   */
  locale?: Locale;
  build?: OpenSlideBuildConfig;
  live?: OpenSlideLiveConfig;
  agent?: OpenSlideAgentConfig;
};
