import fs from "node:fs/promises";
import { atomicWriteJson, readJson } from "../fs/atomic";
import {
  type RoomId,
  RoomIdSchema,
  type RoomMessage,
  RoomMessageSchema,
  type RoomMeta,
  RoomMetaSchema,
} from "../schemas";
import type { RoomStore } from "./contracts";
import { FSLayout } from "./fs-layout";

export class FSRoomStore implements RoomStore {
  private readonly layout: FSLayout;

  constructor(baseDir: string) {
    this.layout = new FSLayout(baseDir);
  }

  async create(meta: RoomMeta): Promise<void> {
    await fs.mkdir(this.layout.roomDir(meta.id), { recursive: true });
    await atomicWriteJson(this.layout.roomMetaFile(meta.id), meta);
    await fs.writeFile(this.layout.roomMessagesFile(meta.id), "");
  }

  async get(roomId: RoomId): Promise<RoomMeta | undefined> {
    const raw = await readJson<unknown>(this.layout.roomMetaFile(roomId));
    const parsed = RoomMetaSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  }

  async list(): Promise<RoomMeta[]> {
    let dirs: string[];
    try {
      dirs = await fs.readdir(this.layout.roomsDir);
    } catch {
      return [];
    }

    const rooms: RoomMeta[] = [];
    for (const dir of dirs) {
      const parsed = RoomIdSchema.safeParse(dir);
      if (!parsed.success) continue;
      const room = await this.get(parsed.data);
      if (room) rooms.push(room);
    }

    return rooms;
  }

  async appendMessage(roomId: RoomId, message: RoomMessage): Promise<void> {
    const line = `${JSON.stringify(message)}\n`;
    await fs.appendFile(this.layout.roomMessagesFile(roomId), line);
  }

  async readMessages(roomId: RoomId): Promise<RoomMessage[]> {
    let content: string;
    try {
      content = await fs.readFile(
        this.layout.roomMessagesFile(roomId),
        "utf-8",
      );
    } catch {
      return [];
    }

    const messages: RoomMessage[] = [];
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      const parsed = RoomMessageSchema.safeParse(JSON.parse(line));
      if (parsed.success) messages.push(parsed.data);
    }

    return messages;
  }
}
