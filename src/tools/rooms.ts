import crypto from "node:crypto";
import {
  MessageIdSchema,
  PeerIdSchema,
  RoomIdSchema,
  type RoomMessage,
  type RoomMeta,
} from "../schemas";
import type { RoomStore } from "../store/contracts";

function generateRoomMessageId(): RoomMessage["id"] {
  return MessageIdSchema.parse(
    `rm_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
  );
}

interface CreateRoomOpts {
  roomId: string;
  createdBy: string;
  description?: string;
}

export async function createRoom(
  store: RoomStore,
  opts: CreateRoomOpts,
): Promise<RoomMeta> {
  const meta: RoomMeta = {
    id: RoomIdSchema.parse(opts.roomId),
    description: opts.description,
    createdBy: PeerIdSchema.parse(opts.createdBy),
    createdAt: new Date().toISOString(),
  };

  await store.create(meta);
  return meta;
}

export async function listRooms(store: RoomStore): Promise<RoomMeta[]> {
  return store.list();
}

interface SendRoomMessageOpts {
  roomId: string;
  from: string;
  content: string;
}

export async function sendRoomMessage(
  store: RoomStore,
  opts: SendRoomMessageOpts,
): Promise<RoomMessage> {
  const msg: RoomMessage = {
    id: generateRoomMessageId(),
    from: PeerIdSchema.parse(opts.from),
    content: opts.content,
    createdAt: new Date().toISOString(),
  };

  await store.appendMessage(RoomIdSchema.parse(opts.roomId), msg);
  return msg;
}

interface ReadRoomMessagesOpts {
  roomId: string;
  since?: string;
  lastN?: number;
}

export async function readRoomMessages(
  store: RoomStore,
  opts: ReadRoomMessagesOpts,
): Promise<RoomMessage[]> {
  let messages = await store.readMessages(RoomIdSchema.parse(opts.roomId));

  if (opts.since) {
    const since = opts.since;
    messages = messages.filter((m) => m.createdAt > since);
  }

  if (opts.lastN !== undefined) {
    messages = messages.slice(-opts.lastN);
  }

  return messages;
}
