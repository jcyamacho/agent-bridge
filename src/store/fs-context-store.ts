import fs from "node:fs/promises";
import { type ContextKey, ContextKeySchema, type RoomId } from "../schemas";
import type { ContextStore } from "./contracts";
import { FSLayout } from "./fs-layout";

export class FSContextStore implements ContextStore {
  private readonly layout: FSLayout;

  constructor(baseDir: string) {
    this.layout = new FSLayout(baseDir);
  }

  async put(roomId: RoomId, key: ContextKey, content: string): Promise<void> {
    await fs.mkdir(this.layout.roomContextDir(roomId), { recursive: true });
    await fs.writeFile(this.layout.roomContextFile(roomId, key), content);
  }

  async get(roomId: RoomId, key: ContextKey): Promise<string> {
    return fs.readFile(this.layout.roomContextFile(roomId, key), "utf-8");
  }

  async listKeys(roomId: RoomId): Promise<ContextKey[]> {
    try {
      const files = await fs.readdir(this.layout.roomContextDir(roomId));
      const keys: ContextKey[] = [];
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const parsed = ContextKeySchema.safeParse(file.replace(/\.md$/, ""));
        if (parsed.success) keys.push(parsed.data);
      }
      return keys;
    } catch {
      return [];
    }
  }
}
