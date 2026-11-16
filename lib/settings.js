import { DEFAULT_FORMAT } from "./dates.js";

/** What the plugin does until the user changes it. */
export const DEFAULTS = {
  folder: "Daily",
  format: DEFAULT_FORMAT,
};

/**
 * Settings saved in the plugin's `data.json`. Missing or invalid values
 * keep the default, so an older file still loads.
 * @param {unknown} data
 * @returns {{ folder: string, format: string }}
 */
export function settingsFrom(data) {
  const source = /** @type {{ folder?: unknown, format?: unknown }} */ (
    data !== null && typeof data === "object" ? data : {}
  );
  return {
    folder: typeof source.folder === "string" ? source.folder : DEFAULTS.folder,
    format: typeof source.format === "string" ? source.format : DEFAULTS.format,
  };
}
