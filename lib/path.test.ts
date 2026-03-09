import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stem } from "./path.ts";

describe("stem", () => {
  it("returns filename without extension", () => {
    assert.equal(stem("notes/hello-world.md"), "hello-world");
  });

  it("returns filename when there is no extension", () => {
    assert.equal(stem("notes/README"), "README");
  });

  it("handles nested paths", () => {
    assert.equal(stem("/home/user/docs/file.txt"), "file");
  });

  it("strips only the last extension", () => {
    assert.equal(stem("archive.tar.gz"), "archive.tar");
  });
});
