/**
 * Notational Velocity-style note-taking extension for Pi.
 *
 * /notational — type-ahead search across .md filenames, enter to open or create.
 * New notes get frontmatter with the original title, slugified filename,
 * and a second step to write the body.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  Input,
  Key,
  matchesKey,
  type SelectItem,
  SelectList,
  truncateToWidth,
} from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as path from "node:path";
import { toSlug } from "../lib/slug.ts";
import { type Note, parseNote, serializeNote } from "../lib/note.ts";
import { stem } from "../lib/path.ts";

type NoteSearchResult =
  | { action: "open"; filePath: string }
  | { action: "create"; title: string };

/** Resolve the notes directory from command args and cwd. */
export const resolveDir = (cwd: string, args: string | undefined): string =>
  args ? path.resolve(cwd, args.trim()) : cwd;

/** Derive a .md filename from a title, or undefined if the title can't be slugified. */
export const noteFileName = (title: string): string | undefined => {
  const slug = toSlug(title);
  return slug ? `${slug}.md` : undefined;
};

/** Build an updated Note from an existing note with new body content. */
export const updateNote = (note: Note, body: string, now: string): string =>
  serializeNote({
    ...note,
    content: body.trim(),
    created: note.created ?? now,
    updated: now,
  });

/** Build a new Note from a title and body. */
export const newNote = (title: string, body: string, now: string): string =>
  serializeNote({
    title,
    created: now,
    updated: now,
    content: body.trim(),
    meta: {},
  });

/** Scan directory for .md files, returning SelectItems with frontmatter titles. */
const scanNotes = (dir: string): SelectItem[] => {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const filePath = path.join(dir, f);
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          const note = parseNote(raw);
          return {
            value: f,
            label: note.title || stem(f),
            description: f,
          };
        } catch {
          return { value: f, label: stem(f), description: f };
        }
      });
  } catch {
    return [];
  }
};

export default function (pi: ExtensionAPI): void {
  pi.registerCommand("notational", {
    description: "Search or create a note",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/note requires interactive mode", "error");
        return;
      }

      const dir = resolveDir(ctx.cwd, args);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      } else if (!fs.statSync(dir).isDirectory()) {
        ctx.ui.notify(`Not a directory: ${dir}`, "error");
        return;
      }

      const notes = scanNotes(dir);

      // Step 1: Type-ahead search / select
      const result = await ctx.ui.custom<NoteSearchResult | undefined>(
        (tui, theme, _kb, done) => {
          const input = new Input();
          const selectList = new SelectList(
            notes,
            Math.min(notes.length, 10) || 1,
            {
              selectedPrefix: (t) => theme.fg("accent", t),
              selectedText: (t) => theme.fg("accent", t),
              description: (t) => theme.fg("muted", t),
              scrollInfo: (t) => theme.fg("dim", t),
              noMatch: (t) => theme.fg("warning", t),
            },
          );

          // Track focus for IME cursor positioning
          let _focused = false;

          return {
            get focused(): boolean {
              return _focused;
            },
            set focused(v: boolean) {
              _focused = v;
              input.focused = v;
            },

            render(width: number): string[] {
              const lines: string[] = [];
              lines.push(theme.fg("accent", "─".repeat(width)));
              lines.push(
                truncateToWidth(
                  ` ${theme.fg("accent", theme.bold("Note"))} ${theme.fg(
                    "dim",
                    "type to search or create",
                  )}`,
                  width,
                ),
              );
              lines.push("");
              for (const line of input.render(width - 2)) {
                lines.push(truncateToWidth(` ${line}`, width));
              }
              lines.push("");
              if (selectList.getSelectedItem()) {
                for (const line of selectList.render(width)) {
                  lines.push(line);
                }
              } else {
                const inputValue = input.getValue().trim();
                if (inputValue) {
                  const slug = toSlug(inputValue) ?? inputValue;
                  lines.push(
                    truncateToWidth(
                      `  ${theme.fg("muted", `Create ${slug}.md`)}`,
                      width,
                    ),
                  );
                }
              }
              lines.push("");
              lines.push(
                truncateToWidth(
                  theme.fg(
                    "dim",
                    " ↑↓ navigate • enter select/create • esc cancel",
                  ),
                  width,
                ),
              );
              lines.push(theme.fg("accent", "─".repeat(width)));
              return lines;
            },

            handleInput(data: string): void {
              if (matchesKey(data, Key.escape)) {
                done(undefined);
                return;
              }

              if (matchesKey(data, Key.up) || matchesKey(data, Key.down)) {
                selectList.handleInput(data);
                tui.requestRender();
                return;
              }

              if (matchesKey(data, Key.enter)) {
                const selected = selectList.getSelectedItem();
                const inputValue = input.getValue().trim();
                if (selected) {
                  done({ action: "open", filePath: selected.value });
                } else if (inputValue) {
                  done({ action: "create", title: inputValue });
                }
                return;
              }

              // All other keys go to the text input
              input.handleInput(data);
              const raw = input.getValue();
              selectList.setFilter(toSlug(raw) ?? raw);
              tui.requestRender();
            },

            invalidate(): void {
              input.invalidate();
              selectList.invalidate();
            },
          };
        },
      );

      if (!result) return;

      // Open existing note for editing
      if (result.action === "open") {
        const filePath = path.join(dir, result.filePath);
        let note;
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          note = parseNote(raw);
        } catch {
          ctx.ui.notify(`Failed to read ${result.filePath}`, "error");
          return;
        }

        const body = await ctx.ui.editor(
          `Edit ${result.filePath}:`,
          note.content,
        );
        if (body === undefined) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }

        fs.writeFileSync(
          filePath,
          updateNote(note, body, new Date().toISOString()),
          "utf-8",
        );
        ctx.ui.notify(`Saved ${filePath}`, "info");
        return;
      }

      // Create new note
      const fileName = noteFileName(result.title);
      if (!fileName) {
        ctx.ui.notify("Could not create slug from title", "error");
        return;
      }

      const filePath = path.join(dir, fileName);

      // If slug collides with existing file, open it instead
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          const note = parseNote(raw);
          ctx.ui.setEditorText(note.content);
          ctx.ui.notify(`Opened ${fileName}`, "info");
        } catch {
          ctx.ui.notify(`Failed to read ${fileName}`, "error");
        }
        return;
      }

      // Step 2: Write body
      const body = await ctx.ui.editor("Write note body:", "");
      if (body === undefined) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }

      fs.writeFileSync(
        filePath,
        newNote(result.title, body, new Date().toISOString()),
        "utf-8",
      );
      ctx.ui.notify(`Saved ${filePath}`, "info");
    },
  });
}
