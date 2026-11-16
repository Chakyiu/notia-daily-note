import { Notice, Plugin, ui } from "notia";
import { addDays, dailyNotePath, formatHelp, localToday, noteHeading } from "./lib/dates.js";
import { settingsFrom } from "./lib/settings.js";

export default class DailyNotes extends Plugin {
  /**
   * @param {import("notia").App} app
   * @param {import("notia").PluginManifest} manifest
   */
  constructor(app, manifest) {
    super(app, manifest);
    /** @type {{ folder: string, format: string }} */
    this.settings = settingsFrom(null);
    /** @type {import("notia").SettingTabHandle | undefined} */
    this.tab = undefined;
  }

  onload() {
    this.tab = this.addSettingTab({
      icon: "calendar",
      render: () => this.renderSettings(),
    });
    this.loadData().then(
      (data) => this.applySettings(settingsFrom(data)),
      () => {},
    );

    this.addRibbonIcon("calendar", "Open today's daily note", () => this.open(0));
    this.addCommand({
      id: "today",
      name: "Open today's daily note",
      icon: "calendar",
      hotkey: "secondary-shift-t",
      callback: () => this.open(0),
    });
    this.addCommand({
      id: "yesterday",
      name: "Open yesterday's daily note",
      callback: () => this.open(-1),
    });
    this.addCommand({
      id: "tomorrow",
      name: "Open tomorrow's daily note",
      callback: () => this.open(1),
    });
  }

  /** @param {{ folder: string, format: string }} settings */
  applySettings(settings) {
    this.settings = settings;
    this.tab?.refresh();
  }

  /** @param {"folder" | "format"} key @param {string} value */
  setSetting(key, value) {
    const settings = {
      folder: key === "folder" ? value : this.settings.folder,
      format: key === "format" ? value : this.settings.format,
    };
    this.applySettings(settings);
    this.saveData(settings);
  }

  renderSettings() {
    const today = localToday();
    return [
      ui.setting(
        "Folder",
        ui.textInput(this.settings.folder, (folder) => this.setSetting("folder", folder)),
        {
          description:
            "Where new daily notes go, inside the vault. Leave empty for the vault root.",
        },
      ),
      ui.setting(
        "Name",
        ui.textInput(this.settings.format, (format) => this.setSetting("format", format)),
        { description: formatHelp(today, this.settings) },
      ),
    ];
  }

  /** @param {number} offsetDays */
  open(offsetDays) {
    const date = addDays(localToday(), offsetDays);
    const path = dailyNotePath(date, this.settings);
    try {
      if (!this.app.vault.exists(path)) {
        this.app.vault.create(path, noteHeading(date));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Could not create the daily note: ${message}`);
      return;
    }
    this.app.workspace.openNote(path);
  }
}
