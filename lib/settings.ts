import * as fs from "node:fs";
import * as os from "node:os";
import path from "node:path";

/** Settings shape for `notational.json`. */
export type NotationalSettings = {
  dir?: string;
};

const SETTINGS_FILENAME = "notational.json";

/** Try to parse a JSON file as a NotationalSettings object. */
const readSettingsFile = (filePath: string): NotationalSettings | undefined => {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as NotationalSettings;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

/** Read project-local `.pi/notational.json`, or undefined. */
export const readLocalSettings = (
  cwd: string,
): NotationalSettings | undefined =>
  readSettingsFile(path.join(cwd, ".pi", SETTINGS_FILENAME));

/**
 * Read global `~/.pi/agent/notational.json`, or undefined.
 *
 * Respects `PI_CODING_AGENT_DIR` if set, otherwise defaults to `~/.pi/agent`.
 */
export const readGlobalSettings = (): NotationalSettings | undefined => {
  const agentDir =
    process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), ".pi", "agent");
  return readSettingsFile(path.join(agentDir, SETTINGS_FILENAME));
};

/**
 * Resolve a notes directory from a base cwd and optional args string.
 *
 * Priority:
 * 1. Explicit `args` (CLI argument or `/notational <dir>`)
 * 2. `dir` from local `.pi/notational.json` in the cwd
 * 3. `dir` from global `~/.pi/agent/notational.json`
 * 4. The cwd itself
 */
export const resolveDirUsingSettings = (
  cwd: string,
  args: string | undefined,
): string => {
  if (args?.trim()) {
    return path.resolve(cwd, args.trim());
  }

  const local = readLocalSettings(cwd);
  if (local?.dir) {
    return path.resolve(cwd, local.dir);
  }

  const global = readGlobalSettings();
  if (global?.dir) {
    return path.resolve(global.dir);
  }

  return cwd;
};
