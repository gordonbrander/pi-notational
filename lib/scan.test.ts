import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scanNotes, filterNotes, type NoteItem } from "./scan.ts";

/** Create a temp directory that is cleaned up after each test. */
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Write a file into the temp directory. */
const writeNote = (fileName: string, content: string): void => {
  fs.writeFileSync(path.join(tmpDir, fileName), content, "utf-8");
};

const withFrontmatter = (title: string, body: string): string =>
  `---\ntitle: ${title}\n---\n${body}\n`;

// ── scanNotes ─────────────────────────────────────────────────

describe("scanNotes", () => {
  it("returns an empty array for an empty directory", () => {
    assert.deepEqual(scanNotes(tmpDir), []);
  });

  it("returns an empty array when the directory does not exist", () => {
    assert.deepEqual(scanNotes(path.join(tmpDir, "nope")), []);
  });

  it("picks up .md files", () => {
    writeNote("hello.md", withFrontmatter("Hello", "body"));
    const result = scanNotes(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].fileName, "hello.md");
  });

  it("ignores non-.md files", () => {
    writeNote("notes.txt", "not a note");
    writeNote("hello.md", withFrontmatter("Hello", "body"));
    const result = scanNotes(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].fileName, "hello.md");
  });

  it("uses the frontmatter title as label", () => {
    writeNote("hello.md", withFrontmatter("Hello World", "body"));
    const result = scanNotes(tmpDir);
    assert.equal(result[0].label, "Hello World");
  });

  it("falls back to the file stem when there is no frontmatter", () => {
    writeNote("hello-world.md", "just some text");
    const result = scanNotes(tmpDir);
    assert.equal(result[0].label, "hello-world");
  });

  it("falls back to the file stem when the title is empty", () => {
    writeNote("hello-world.md", "---\ntitle: \"\"\n---\nbody\n");
    const result = scanNotes(tmpDir);
    assert.equal(result[0].label, "hello-world");
  });

  it("sets slug to the file stem", () => {
    writeNote("my-great-note.md", withFrontmatter("My Great Note", "body"));
    const result = scanNotes(tmpDir);
    assert.equal(result[0].slug, "my-great-note");
  });

  it("scans multiple files", () => {
    writeNote("a.md", withFrontmatter("Alpha", ""));
    writeNote("b.md", withFrontmatter("Beta", ""));
    writeNote("c.md", withFrontmatter("Gamma", ""));
    const result = scanNotes(tmpDir);
    assert.equal(result.length, 3);
    const fileNames = result.map((n) => n.fileName).sort();
    assert.deepEqual(fileNames, ["a.md", "b.md", "c.md"]);
  });

  it("handles a file with malformed frontmatter gracefully", () => {
    writeNote("bad.md", "---\n: invalid yaml\n---\nbody\n");
    const result = scanNotes(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].label, "bad");
    assert.equal(result[0].slug, "bad");
  });
});

// ── filterNotes ───────────────────────────────────────────────

describe("filterNotes", () => {
  const notes: NoteItem[] = [
    { fileName: "hello-world.md", label: "Hello World", slug: "hello-world" },
    { fileName: "cooking-tips.md", label: "Cooking Tips", slug: "cooking-tips" },
    { fileName: "my_journal.md", label: "My Journal", slug: "my_journal" },
  ];

  it("returns all notes when the query is empty", () => {
    assert.deepEqual(filterNotes(notes, ""), notes);
  });

  it("returns all notes when the query is whitespace", () => {
    assert.deepEqual(filterNotes(notes, "   "), notes);
  });

  it("matches by slug substring", () => {
    const result = filterNotes(notes, "hello");
    assert.equal(result.length, 1);
    assert.equal(result[0].fileName, "hello-world.md");
  });

  it("matches by label substring (case-insensitive)", () => {
    const result = filterNotes(notes, "Cooking");
    assert.equal(result.length, 1);
    assert.equal(result[0].fileName, "cooking-tips.md");
  });

  it("slugifies the query before matching", () => {
    const result = filterNotes(notes, "Hello World");
    assert.equal(result.length, 1);
    assert.equal(result[0].fileName, "hello-world.md");
  });

  it("returns an empty array when nothing matches", () => {
    const result = filterNotes(notes, "zzz");
    assert.equal(result.length, 0);
  });

  it("matches partial slugs", () => {
    const result = filterNotes(notes, "cook");
    assert.equal(result.length, 1);
    assert.equal(result[0].fileName, "cooking-tips.md");
  });

  it("matches multiple notes when query is broad", () => {
    const items: NoteItem[] = [
      { fileName: "a.md", label: "Foo Bar", slug: "foo-bar" },
      { fileName: "b.md", label: "Foo Baz", slug: "foo-baz" },
      { fileName: "c.md", label: "Qux", slug: "qux" },
    ];
    const result = filterNotes(items, "foo");
    assert.equal(result.length, 2);
  });

  it("preserves order of matched notes", () => {
    const result = filterNotes(notes, "my");
    const fileNames = result.map((n) => n.fileName);
    assert.deepEqual(fileNames, ["my_journal.md"]);
  });
});
