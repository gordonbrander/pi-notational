import path from "node:path";

/** Get the stem of a path (filename sans extension) */
export const stem = (filePath: string): string =>
  path.basename(filePath, path.extname(filePath));

/** Resolve a notes directory from a base cwd and optional args string. */
export const resolveDir = (cwd: string, args: string | undefined): string =>
  args?.trim() ? path.resolve(cwd, args.trim()) : cwd;
