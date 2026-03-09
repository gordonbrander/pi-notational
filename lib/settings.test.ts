import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  readLocalSettings,
  readGlobalSettings,
  resolveDirUsingSettings,
} from "./settings.ts";

/** Write a `.pi/notational.json` inside the given directory. */
const writeLocalSettings = (
  dir: string,
  settings: Record<string, unknown>,
): void => {
  const settingsDir = path.join(dir, ".pi");
  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(
    path.join(settingsDir, "notational.json"),
    JSON.stringify(settings),
    "utf-8",
  );
};

/** Write a `notational.json` inside the given agent directory. */
const writeGlobalSettings = (
  agentDir: string,
  settings: Record<string, unknown>,
): void => {
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentDir, "notational.json"),
    JSON.stringify(settings),
    "utf-8",
  );
};

describe("readLocalSettings", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "notational-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns undefined when file does not exist", () => {
    assert.equal(readLocalSettings(tmpDir), undefined);
  });

  it("returns parsed settings", () => {
    writeLocalSettings(tmpDir, { dir: "notes" });
    assert.deepEqual(readLocalSettings(tmpDir), { dir: "notes" });
  });

  it("returns undefined for non-object JSON", () => {
    const settingsDir = path.join(tmpDir, ".pi");
    fs.mkdirSync(settingsDir, { recursive: true });
    fs.writeFileSync(
      path.join(settingsDir, "notational.json"),
      '"just a string"',
      "utf-8",
    );
    assert.equal(readLocalSettings(tmpDir), undefined);
  });
});

describe("readGlobalSettings", () => {
  let globalDir: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    globalDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "notational-global-test-"),
    );
    origEnv = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = globalDir;
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.PI_CODING_AGENT_DIR;
    } else {
      process.env.PI_CODING_AGENT_DIR = origEnv;
    }
    fs.rmSync(globalDir, { recursive: true, force: true });
  });

  it("returns undefined when file does not exist", () => {
    assert.equal(readGlobalSettings(), undefined);
  });

  it("returns parsed settings", () => {
    writeGlobalSettings(globalDir, { dir: "/home/user/notes" });
    assert.deepEqual(readGlobalSettings(), { dir: "/home/user/notes" });
  });

  it("returns undefined for non-object JSON", () => {
    fs.writeFileSync(
      path.join(globalDir, "notational.json"),
      "[1,2,3]",
      "utf-8",
    );
    assert.equal(readGlobalSettings(), undefined);
  });
});

describe("resolveDirUsingSettings", () => {
  it("returns cwd when args is undefined", () => {
    assert.equal(
      resolveDirUsingSettings("/home/user", undefined),
      "/home/user",
    );
  });

  it("returns cwd when args is empty whitespace", () => {
    assert.equal(resolveDirUsingSettings("/home/user", "   "), "/home/user");
  });

  it("resolves a relative path against cwd", () => {
    assert.equal(
      resolveDirUsingSettings("/home/user", "notes"),
      path.resolve("/home/user", "notes"),
    );
  });

  it("returns an absolute path as-is", () => {
    assert.equal(
      resolveDirUsingSettings("/home/user", "/tmp/notes"),
      "/tmp/notes",
    );
  });

  it("trims whitespace from args", () => {
    assert.equal(
      resolveDirUsingSettings("/home/user", "  notes  "),
      path.resolve("/home/user", "notes"),
    );
  });

  describe("with local .pi/notational.json", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "notational-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("uses dir from local settings when args is undefined", () => {
      writeLocalSettings(tmpDir, { dir: "my-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, undefined),
        path.join(tmpDir, "my-notes"),
      );
    });

    it("uses dir from local settings when args is empty", () => {
      writeLocalSettings(tmpDir, { dir: "my-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, "  "),
        path.join(tmpDir, "my-notes"),
      );
    });

    it("resolves absolute dir from local settings", () => {
      writeLocalSettings(tmpDir, { dir: "/tmp/absolute-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, undefined),
        "/tmp/absolute-notes",
      );
    });

    it("prefers args over local settings", () => {
      writeLocalSettings(tmpDir, { dir: "settings-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, "arg-notes"),
        path.join(tmpDir, "arg-notes"),
      );
    });

    it("falls back to cwd when local settings has no dir", () => {
      writeLocalSettings(tmpDir, {});
      assert.equal(resolveDirUsingSettings(tmpDir, undefined), tmpDir);
    });

    it("falls back to cwd when local settings file is invalid JSON", () => {
      const settingsDir = path.join(tmpDir, ".pi");
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(
        path.join(settingsDir, "notational.json"),
        "not json",
        "utf-8",
      );
      assert.equal(resolveDirUsingSettings(tmpDir, undefined), tmpDir);
    });

    it("falls back to cwd when no settings file exists", () => {
      assert.equal(resolveDirUsingSettings(tmpDir, undefined), tmpDir);
    });
  });

  describe("with global ~/.pi/agent/notational.json", () => {
    let tmpDir: string;
    let globalDir: string;
    let origEnv: string | undefined;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "notational-test-"));
      globalDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "notational-global-test-"),
      );
      origEnv = process.env.PI_CODING_AGENT_DIR;
      process.env.PI_CODING_AGENT_DIR = globalDir;
    });

    afterEach(() => {
      if (origEnv === undefined) {
        delete process.env.PI_CODING_AGENT_DIR;
      } else {
        process.env.PI_CODING_AGENT_DIR = origEnv;
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.rmSync(globalDir, { recursive: true, force: true });
    });

    it("uses dir from global settings when no args and no local settings", () => {
      writeGlobalSettings(globalDir, { dir: "/tmp/global-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, undefined),
        "/tmp/global-notes",
      );
    });

    it("resolves relative global dir as absolute (from global settings)", () => {
      writeGlobalSettings(globalDir, { dir: "relative-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, undefined),
        path.resolve("relative-notes"),
      );
    });

    it("prefers local settings over global settings", () => {
      writeLocalSettings(tmpDir, { dir: "local-notes" });
      writeGlobalSettings(globalDir, { dir: "/tmp/global-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, undefined),
        path.join(tmpDir, "local-notes"),
      );
    });

    it("prefers args over global settings", () => {
      writeGlobalSettings(globalDir, { dir: "/tmp/global-notes" });
      assert.equal(
        resolveDirUsingSettings(tmpDir, "arg-notes"),
        path.join(tmpDir, "arg-notes"),
      );
    });

    it("falls back to cwd when global settings has no dir", () => {
      writeGlobalSettings(globalDir, {});
      assert.equal(resolveDirUsingSettings(tmpDir, undefined), tmpDir);
    });

    it("falls back to cwd when global settings is invalid JSON", () => {
      fs.writeFileSync(
        path.join(globalDir, "notational.json"),
        "not json",
        "utf-8",
      );
      assert.equal(resolveDirUsingSettings(tmpDir, undefined), tmpDir);
    });
  });
});
