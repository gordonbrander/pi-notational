import matter from "gray-matter";
import yaml from "js-yaml";
import { toSlug } from "./slug.ts";

export type Note = {
  title: string;
  created: string | undefined;
  updated: string | undefined;
  content: string;
  meta: Record<string, unknown>;
};

export const getTitle = (meta: Record<string, unknown>): string | undefined => {
  return typeof meta.title === "string" ? meta.title : undefined;
};

const getString = (
  meta: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = meta[key];
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
};

export const parseNote = (raw: string): Note => {
  const { data, content } = matter(raw);
  return {
    title: getTitle(data) ?? "",
    created: getString(data, "created"),
    updated: getString(data, "updated"),
    content: content.trim(),
    meta: data,
  };
};

export const serializeNote = (note: Note): string => {
  const { title, created, updated, meta } = note;
  const { title: _t, created: _c, updated: _u, ...rest } = meta;
  const ordered: Record<string, unknown> = { title };
  if (created !== undefined) ordered.created = created;
  if (updated !== undefined) ordered.updated = updated;
  Object.assign(ordered, rest);

  const frontmatter = yaml.dump(ordered, { lineWidth: -1 }).trim();
  return `---\n${frontmatter}\n---\n${note.content}\n`;
};

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
