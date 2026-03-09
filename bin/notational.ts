#!/usr/bin/env -S node --experimental-strip-types

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { runNotational } from "../lib/cli.ts";
import { newNote } from "../lib/note.ts";

const usage = (): void => {
  console.log("Usage: notational [directory]");
  console.log("");
  console.log("Open a Notational Velocity-style note finder.");
  console.log("Search existing .md files or create a new one.");
  console.log("Selected notes are opened in $EDITOR.");
};

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

const dir = path.resolve(args[0] ?? ".");

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
} else if (!fs.statSync(dir).isDirectory()) {
  console.error(`Not a directory: ${dir}`);
  process.exit(1);
}

const result = await runNotational(dir);

if (!result) process.exit(0);

if (result.action === "create") {
  const now = new Date().toISOString();
  fs.writeFileSync(result.filePath, newNote(result.title, "", now), "utf-8");
}

const editor = process.env.EDITOR || "vi";
spawnSync(editor, [result.filePath], { stdio: "inherit" });
