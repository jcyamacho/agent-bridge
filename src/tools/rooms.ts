import fs from "node:fs/promises";
import crypto from "node:crypto";
import type { BridgePaths } from "../fs/paths";
import type { RoomMeta, RoomMessage } from "../schemas";
import { atomicWriteJson, readJson } from "../fs/atomic";

interface CreateRoomOpts {
  name: string;
  createdBy: string;
  description?: string;
}

export async function createRoom(paths: BridgePaths, opts: CreateRoomOpts): Promise<RoomMeta> {
  const meta: RoomMeta = {
    name: opts.name,
    description: opts.description,
    createdBy: opts.createdBy,
    createdAt: new Date().toISOString(),
  };

  await fs.mkdir(paths.roomDir(opts.name), { recursive: true });
  await atomicWriteJson(paths.roomMetaFile(opts.name), meta);
  await fs.writeFile(paths.roomMessagesFile(opts.name), "");
  return meta;
}

export async function listRooms(paths: BridgePaths): Promise<RoomMeta[]> {
  let dirs: string[];
  try {
    dirs = await fs.readdir(paths.roomsDir);
  } catch {
    return [];
  }

  const rooms: RoomMeta[] = [];
  for (const dir of dirs) {
    const meta = await readJson<RoomMeta>(paths.roomMetaFile(dir));
    if (meta) rooms.push(meta);
  }
  return rooms;
}

interface SendRoomMessageOpts {
  room: string;
  from: string;
  content: string;
}

export async function sendRoomMessage(paths: BridgePaths, opts: SendRoomMessageOpts): Promise<RoomMessage> {
  const msg: RoomMessage = {
    id: `rm_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    from: opts.from,
    content: opts.content,
    createdAt: new Date().toISOString(),
  };

  const line = JSON.stringify(msg) + "\n";
  await fs.appendFile(paths.roomMessagesFile(opts.room), line);
  return msg;
}

interface ReadRoomMessagesOpts {
  room: string;
  since?: string;
  lastN?: number;
}

export async function readRoomMessages(paths: BridgePaths, opts: ReadRoomMessagesOpts): Promise<RoomMessage[]> {
  let content: string;
  try {
    content = await fs.readFile(paths.roomMessagesFile(opts.room), "utf-8");
  } catch {
    return [];
  }

  let messages = content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as RoomMessage);

  if (opts.since) {
    messages = messages.filter((m) => m.createdAt > opts.since!);
  }

  if (opts.lastN !== undefined) {
    messages = messages.slice(-opts.lastN);
  }

  return messages;
}
