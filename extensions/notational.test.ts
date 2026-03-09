import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { resolveDir, noteFileName, updateNote, newNote } from "./notational.ts";
import { parseNote, type Note } from "../lib/note.ts";

describe("resolveDir", () => {
  it("returns cwd when args is undefined", () => {
    assert.equal(resolveDir("/home/user", undefined), "/home/user");
  });

  it("returns cwd when args is empty whitespace", () => {
    assert.equal(resolveDir("/home/user", "   "), "/home/user");
  });

  it("resolves a relative path against cwd", () => {
    assert.equal(
      resolveDir("/home/user", "notes"),
      path.resolve("/home/user", "notes"),
    );
  });

  it("returns an absolute path as-is", () => {
    assert.equal(resolveDir("/home/user", "/tmp/notes"), "/tmp/notes");
  });

  it("trims whitespace from args", () => {
    assert.equal(
      resolveDir("/home/user", "  notes  "),
      path.resolve("/home/user", "notes"),
    );
  });
});

describe("noteFileName", () => {
  it("returns a slugified .md filename", () => {
    assert.equal(noteFileName("Hello World"), "hello-world.md");
  });

  it("returns undefined for an empty title", () => {
    assert.equal(noteFileName(""), undefined);
  });

  it("returns undefined for a title with only special characters", () => {
    assert.equal(noteFileName("@#$"), undefined);
  });

  it("preserves hyphens and underscores", () => {
    assert.equal(noteFileName("my-great_note"), "my-great_note.md");
  });
});

describe("updateNote", () => {
  const now = "2026-03-09T06:00:00.000Z";

  const existingNote: Note = {
    title: "Test",
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-02-01T00:00:00.000Z",
    content: "old body",
    meta: { title: "Test", created: "2026-01-01T00:00:00.000Z", updated: "2026-02-01T00:00:00.000Z" },
  };

  it("preserves the existing created timestamp", () => {
    const result = parseNote(updateNote(existingNote, "new body", now));
    assert.equal(result.created, "2026-01-01T00:00:00.000Z");
  });

  it("sets updated to the provided timestamp", () => {
    const result = parseNote(updateNote(existingNote, "new body", now));
    assert.equal(result.updated, now);
  });

  it("replaces the body content", () => {
    const result = parseNote(updateNote(existingNote, "new body", now));
    assert.equal(result.content, "new body");
  });

  it("trims whitespace from the body", () => {
    const result = parseNote(updateNote(existingNote, "  new body  ", now));
    assert.equal(result.content, "new body");
  });

  it("preserves the title", () => {
    const result = parseNote(updateNote(existingNote, "new body", now));
    assert.equal(result.title, "Test");
  });

  it("sets created to now when the note has no created timestamp", () => {
    const noteWithoutCreated: Note = {
      ...existingNote,
      created: undefined,
      meta: { title: "Test" },
    };
    const result = parseNote(updateNote(noteWithoutCreated, "body", now));
    assert.equal(result.created, now);
  });

  it("preserves extra meta fields", () => {
    const noteWithTags: Note = {
      ...existingNote,
      meta: { ...existingNote.meta, tags: ["a", "b"] },
    };
    const result = parseNote(updateNote(noteWithTags, "body", now));
    assert.deepEqual(result.meta.tags, ["a", "b"]);
  });
});

describe("newNote", () => {
  const now = "2026-03-09T06:00:00.000Z";

  it("sets the title", () => {
    const result = parseNote(newNote("My Note", "body text", now));
    assert.equal(result.title, "My Note");
  });

  it("sets created to the provided timestamp", () => {
    const result = parseNote(newNote("My Note", "body text", now));
    assert.equal(result.created, now);
  });

  it("sets updated to the provided timestamp", () => {
    const result = parseNote(newNote("My Note", "body text", now));
    assert.equal(result.updated, now);
  });

  it("sets the body content", () => {
    const result = parseNote(newNote("My Note", "body text", now));
    assert.equal(result.content, "body text");
  });

  it("trims whitespace from the body", () => {
    const result = parseNote(newNote("My Note", "  body text  ", now));
    assert.equal(result.content, "body text");
  });

  it("serializes frontmatter keys in order: title, created, updated", () => {
    const serialized = newNote("My Note", "body", now);
    const frontmatter = serialized.split("---")[1].trim();
    const keys = frontmatter.split("\n").map((line) => line.split(":")[0]);
    assert.deepEqual(keys, ["title", "created", "updated"]);
  });
});
