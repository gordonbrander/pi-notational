# pi-notational

> Notational Velocity for your terminal — search and create notes without friction.

A note-taking tool inspired by [Notational Velocity's](https://notational.net/) unified search-and-create flow. One text field: type to filter existing notes, press enter to open one, or keep typing to create a new one.

Works as a standalone CLI and as a [Pi](https://github.com/mariozechner/pi-coding-agent) coding agent extension.

## Install

### Standalone CLI

```sh
npm install -g @gordonb/pi-notational
```

### Pi extension

```sh
pi package add @gordonb/pi-notational
```

## Standalone CLI

```
notational [directory]
notational --help
```

Run `notational` to open the note finder. Optionally pass a directory path — defaults to the current working directory. If the directory doesn't exist, it's created.

```sh
notational ~/notes
```

When you select or create a note, the file is opened in `$EDITOR` (falls back to `vi`). After you save and quit your editor, you're back at the shell.

```sh
# Use with any editor
EDITOR=nano notational ~/notes
EDITOR="code --wait" notational ~/notes
```

Requires Node.js 22+.

## Pi extension

```
/notational [directory]
```

The `/notational` command opens the same type-ahead finder inside Pi. Notes are edited in Pi's built-in editor.

## Settings

You can set a default notes directory in a `notational.json` settings file. There are two locations, checked in order:

| File                          | Scope                                 |
| ----------------------------- | ------------------------------------- |
| `.pi/notational.json`         | Project-local (per working directory) |
| `~/.pi/agent/notational.json` | Global (all projects)                 |

```json
{
  "dir": "~/notes"
}
```

The local file always wins over the global one. The `dir` field in a local settings file is resolved relative to the working directory; in the global file it is resolved as an absolute path (or relative to the process cwd, so absolute is recommended). Explicit CLI arguments and `/notational <dir>` always take priority over both settings files.

## The flow

1. **Type to search** — as you type, matching `.md` files are filtered in real time by title.
2. **Arrow keys to navigate** — move through the filtered list.
3. **Enter to open** — select an existing note to edit.
4. **Enter to create** — if no match exists, press enter to create a new note with that title. A slugified filename is generated automatically (e.g. "How to cook with cornsalt" → `how-to-cook-with-cornsalt.md`).
5. **Esc to cancel** — dismiss the finder without doing anything.

If you type a title that happens to match an existing file's slug, the existing note is opened instead of creating a duplicate.

## Note format

Notes are Markdown files with YAML frontmatter:

```markdown
---
title: How to cook with cornsalt
created: "2026-03-09T06:00:00.000Z"
updated: "2026-03-09T06:00:00.000Z"
---

Buy box of Arm & Hammer raw cornsalt. Sprinkle on poultry before broiling.
```

- `title` — the original, un-slugified title
- `created` — set once when the note is first written
- `updated` — bumped on every save
- Any additional frontmatter fields you add by hand are preserved across edits.

## Why Notational Velocity?

Notational Velocity's key insight is that **searching and creating are the same gesture**. You never have to decide up front whether you're looking for an existing note or starting a new one — just start typing. This removes the friction that keeps people from writing things down.

The same principle applies inside a coding agent. Quick notes, design decisions, scratch thoughts, bookmarks — they all benefit from a flow where capture is instant and retrieval is just as fast.

## Development

Requires Node.js 22+.

```sh
npm install
npm test
npm run lint
npm run format:check
```

## License

MIT
