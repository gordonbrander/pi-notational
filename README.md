# pi-notational

> Notational Velocity for [Pi](https://github.com/mariozechner/pi-coding-agent). Search and create notes without friction.

A Pi extension that brings [Notational Velocity's](https://notational.net/) unified search-or-create flow to the terminal. One command, one text field: type to filter existing notes, press enter to open one, or keep typing to create a new one.

## Install

```sh
pi package add @gordonb/pi-notational
```

## Usage

```
/notational [directory]
```

Run `/notational` to open the note finder. Optionally pass a directory path — defaults to the current working directory.

### The flow

1. **Type to search** — as you type, matching `.md` files are filtered in real time by title.
2. **Arrow keys to navigate** — move through the filtered list.
3. **Enter to open** — select an existing note to edit its body in Pi's editor.
4. **Enter to create** — if no match exists, press enter to create a new note with that title. A slugified filename is generated automatically (e.g. "How to cook with cornsalt" → `how-to-cook-with-cornsalt.md`).
5. **Esc to cancel** — dismiss the finder without doing anything.

If you type a title that happens to match an existing file's slug, the existing note is opened instead of creating a duplicate.

### Note format

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

This flow also effortlessly coalesces relatied thoughts together. Notes transition effortlessly from scratch notes to evergreen documents, as you rediscover old notes on your way to capturing something new.

`/notational` brings this flow to Pi, making it easy to capture quick notes, design decisions, scratch thoughts, and bookmarks, without breaking your stream of consciousness in the coding agent.

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
