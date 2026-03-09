import * as fs from "node:fs";
import * as path from "node:path";
import { parseNote } from "./note.ts";
import { stem } from "./path.ts";
import { toSlug } from "./slug.ts";

/** A note entry from scanning a directory. */
export type NoteItem = {
  fileName: string;
  label: string;
  slug: string;
};

/** Scan a directory for .md files, reading frontmatter titles. */
export const scanNotes = (dir: string): NoteItem[] => {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const filePath = path.join(dir, f);
        const fileStem = stem(f);
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          const note = parseNote(raw);
          return {
            fileName: f,
            label: note.title || fileStem,
            slug: fileStem,
          };
        } catch {
          return { fileName: f, label: fileStem, slug: fileStem };
        }
      });
  } catch {
    return [];
  }
};

/** Filter notes by matching query against slug and label. */
export const filterNotes = (notes: NoteItem[], query: string): NoteItem[] => {
  const trimmed = query.trim();
  if (!trimmed) return notes;
  const slug = toSlug(trimmed) ?? trimmed.toLowerCase();
  const lower = trimmed.toLowerCase();
  return notes.filter(
    (n) => n.slug.includes(slug) || n.label.toLowerCase().includes(lower),
  );
};
