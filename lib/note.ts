import matter from "gray-matter";
import yaml from "js-yaml";

export type Note = {
  title: string;
  created: string | undefined;
  updated: string | undefined;
  content: string;
  meta: Record<string, unknown>;
};

export const getTitle = (
  meta: Record<string, unknown>,
): string | undefined => {
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

  const frontmatter = yaml
    .dump(ordered, { lineWidth: -1 })
    .trim();
  return `---\n${frontmatter}\n---\n${note.content}\n`;
};
