import fs from "node:fs/promises";
import type { BridgePaths } from "../fs/paths";

interface PostContextOpts {
  room: string;
  key: string;
  content: string;
}

export async function postContext(paths: BridgePaths, opts: PostContextOpts): Promise<void> {
  const dir = paths.roomContextDir(opts.room);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(paths.roomContextFile(opts.room, opts.key), opts.content);
}

export async function readContext(
  paths: BridgePaths,
  opts: { room: string; key: string },
): Promise<string> {
  return fs.readFile(paths.roomContextFile(opts.room, opts.key), "utf-8");
}

export async function listContext(
  paths: BridgePaths,
  opts: { room: string },
): Promise<string[]> {
  try {
    const files = await fs.readdir(paths.roomContextDir(opts.room));
    return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}
