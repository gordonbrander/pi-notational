import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { resolveDir } from "./path.ts";

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
