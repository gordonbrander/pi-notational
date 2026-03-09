/**
 * Standalone terminal TUI for the Notational Velocity note finder.
 *
 * Provides the same type-ahead search/create flow as the Pi extension,
 * but renders directly to the terminal using ANSI escape codes.
 */

import * as path from "node:path";
import { toSlug } from "./slug.ts";
import { type NoteItem, scanNotes, filterNotes } from "./scan.ts";

// ── ANSI helpers ──────────────────────────────────────────────

const ESC = "\x1b";
const CSI = `${ESC}[`;

const bold = (s: string): string => `${CSI}1m${s}${CSI}22m`;
const cyan = (s: string): string => `${CSI}36m${s}${CSI}39m`;
const dim = (s: string): string => `${CSI}2m${s}${CSI}22m`;

const HIDE_CURSOR = `${CSI}?25l`;
const SHOW_CURSOR = `${CSI}?25h`;
const CLEAR_DOWN = `${CSI}J`;
const moveUp = (n: number): string => (n > 0 ? `${CSI}${n}A` : "");

// ── Types ─────────────────────────────────────────────────────

export type CliResult =
  | { action: "open"; filePath: string }
  | { action: "create"; filePath: string; title: string };

// ── Render ────────────────────────────────────────────────────

const MAX_VISIBLE = 10;

const renderLines = (
  query: string,
  filtered: NoteItem[],
  selected: number,
  width: number,
): string[] => {
  const lines: string[] = [];

  lines.push(dim("─".repeat(width)));
  lines.push(` ${cyan(bold("Note"))} ${dim("type to search or create")}`);
  lines.push("");
  lines.push(` ${query}${dim("█")}`);
  lines.push("");

  if (filtered.length > 0) {
    const visible = filtered.slice(0, MAX_VISIBLE);
    for (let i = 0; i < visible.length; i++) {
      const item = visible[i];
      if (i === selected) {
        lines.push(`  ${cyan("›")} ${cyan(item.label)} ${dim(item.fileName)}`);
      } else {
        lines.push(`    ${item.label} ${dim(item.fileName)}`);
      }
    }
    if (filtered.length > MAX_VISIBLE) {
      lines.push(dim(`    … ${filtered.length - MAX_VISIBLE} more`));
    }
  } else if (query.trim()) {
    const slug = toSlug(query.trim()) ?? query.trim();
    lines.push(`  ${dim(`Create ${slug}.md`)}`);
  }

  lines.push("");
  lines.push(dim(" ↑↓ navigate • enter select/create • esc cancel"));
  lines.push(dim("─".repeat(width)));

  return lines;
};

// ── TUI loop ──────────────────────────────────────────────────

export const runNotational = (dir: string): Promise<CliResult | undefined> =>
  new Promise((resolve) => {
    const notes = scanNotes(dir);

    let query = "";
    let selected = 0;
    let lastLineCount = 0;

    const getFiltered = (): NoteItem[] => filterNotes(notes, query);

    const render = (): void => {
      const width = process.stdout.columns || 80;
      const filtered = getFiltered();
      const lines = renderLines(query, filtered, selected, width);

      if (lastLineCount > 0) {
        process.stdout.write(moveUp(lastLineCount));
      }
      process.stdout.write(`\r${CLEAR_DOWN}`);
      process.stdout.write(lines.join("\n") + "\n");

      lastLineCount = lines.length;
    };

    const cleanup = (): void => {
      process.stdout.write(SHOW_CURSOR);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.removeListener("SIGWINCH", render);
    };

    const done = (result: CliResult | undefined): void => {
      cleanup();
      resolve(result);
    };

    const onData = (data: string): void => {
      // Ctrl+C
      if (data === "\x03") {
        done(undefined);
        return;
      }

      // Escape (bare, not part of an arrow sequence)
      if (data === ESC) {
        done(undefined);
        return;
      }

      // Up arrow
      if (data === `${ESC}[A`) {
        const count = Math.min(getFiltered().length, MAX_VISIBLE);
        if (count > 0) {
          selected = (selected - 1 + count) % count;
        }
        render();
        return;
      }

      // Down arrow
      if (data === `${ESC}[B`) {
        const count = Math.min(getFiltered().length, MAX_VISIBLE);
        if (count > 0) {
          selected = (selected + 1) % count;
        }
        render();
        return;
      }

      // Enter
      if (data === "\r" || data === "\n") {
        const filtered = getFiltered();
        const trimmed = query.trim();
        if (filtered.length > 0 && selected < filtered.length) {
          done({
            action: "open",
            filePath: path.join(dir, filtered[selected].fileName),
          });
        } else if (trimmed) {
          const slug = toSlug(trimmed);
          if (!slug) return;
          done({
            action: "create",
            filePath: path.join(dir, `${slug}.md`),
            title: trimmed,
          });
        }
        return;
      }

      // Backspace
      if (data === "\x7f" || data === "\b") {
        if (query.length > 0) {
          query = query.slice(0, -1);
          selected = 0;
          render();
        }
        return;
      }

      // Ignore other escape sequences
      if (data.startsWith(ESC)) return;

      // Printable characters (including multi-byte / emoji)
      query += data;
      selected = 0;
      render();
    };

    // Set up terminal
    process.stdout.write(HIDE_CURSOR);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", onData);
    process.on("SIGWINCH", render);

    render();
  });
