# Daily notes

A Notia community plugin. It opens a note for each day and creates the note the first time, with a heading such as `# Wednesday, November 4, 2026`.

The folder and the file name are on the plugin's settings page. The name is a [chrono](https://docs.rs/chrono/latest/chrono/format/strftime/index.html) date format, the same kind the built-in plugin used. `%Y-%m-%d` is the default, so today's note is `Daily/2026-11-04.md`. A format that is not a date, or that asks for a time, is ignored and the note uses `%Y-%m-%d` instead. An empty folder puts the note in the vault root.

Settings are kept in this folder's `data.json`. A vault that previously used the built-in daily notes plugin still has `.notia/plugin-data/daily-notes.json`; this plugin cannot read that hidden file, so set the folder and name once after installing it.

## Install

Notia loads plugins from `.notia/plugins` inside the vault, one folder per plugin, named after the plugin id. Put this folder there as `daily-notes`.

On macOS and Linux, link it so the code you edit here is what the vault runs:

```bash
mkdir -p "/path/to/vault/.notia/plugins"
ln -s "/path/to/notia-daily-note" "/path/to/vault/.notia/plugins/daily-notes"
```

On Windows, copy the folder instead — a symlink needs Developer Mode or an elevated shell:

```bat
xcopy /E /I notia-daily-note "%USERPROFILE%\vault\.notia\plugins\daily-notes"
```

Open the vault, then turn **Daily notes** on in **Settings → Plugins**. Saving a file in this folder reloads the plugin.

## Shortcuts

On Windows and Linux, Ctrl takes the place of ⌘.

| Action | Shortcut |
| --- | --- |
| Open today's daily note | `⌘⇧T` |

**Open yesterday's daily note** and **Open tomorrow's daily note** are in the command palette. The calendar button on the ribbon opens today's note.

## Develop

`notia.d.ts` is a copy of the plugin API, so this folder does not depend on where Notia's source is. `jsconfig.json` points editors at it. When Notia's API changes, copy the new one from `crates/notia-js/notia.d.ts` in Notia, or from `.notia/plugins/notia.d.ts`, which the command **Open the community plugins folder** writes.

## Check

```bash
npm test
npx -p typescript tsc -p jsconfig.json
```

The second command checks `main.js` against `notia.d.ts`.
