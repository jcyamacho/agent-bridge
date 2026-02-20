import crypto from "node:crypto";
import {
  MessageIdSchema,
  PeerIdSchema,
  RoomIdSchema,
  type RoomMessage,
  RoomMessageTypeSchema,
  type RoomMeta,
} from "../schemas";
import type { RoomStore } from "../store/contracts";

function generateRoomMessageId(): RoomMessage["id"] {
  return MessageIdSchema.parse(
    `rm_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
  );
}

interface OpenFeatureRoomOpts {
  roomId: string;
  createdBy: string;
  description?: string;
}

export async function openFeatureRoom(
  store: RoomStore,
  opts: OpenFeatureRoomOpts,
): Promise<RoomMeta> {
  const meta: RoomMeta = {
    id: RoomIdSchema.parse(opts.roomId),
    description: opts.description,
    createdBy: PeerIdSchema.parse(opts.createdBy),
    createdAt: new Date().toISOString(),
    status: "open",
  };

  await store.create(meta);
  return meta;
}

interface CloseFeatureRoomOpts {
  roomId: string;
}

export async function closeFeatureRoom(
  store: RoomStore,
  opts: CloseFeatureRoomOpts,
): Promise<RoomMeta> {
  const closedAt = new Date().toISOString();
  return store.close(RoomIdSchema.parse(opts.roomId), closedAt);
}

interface ListFeatureRoomsOpts {
  includeClosed?: boolean;
}

export async function listFeatureRooms(
  store: RoomStore,
  opts?: ListFeatureRoomsOpts,
): Promise<RoomMeta[]> {
  return store.list({
    includeClosed: opts?.includeClosed ?? false,
  });
}

interface PostFeatureMessageOpts {
  roomId: string;
  from: string;
  content: string;
  type: string;
}

export async function postFeatureMessage(
  store: RoomStore,
  opts: PostFeatureMessageOpts,
): Promise<RoomMessage> {
  const msg: RoomMessage = {
    id: generateRoomMessageId(),
    from: PeerIdSchema.parse(opts.from),
    content: opts.content,
    type: RoomMessageTypeSchema.parse(opts.type),
    createdAt: new Date().toISOString(),
  };

  await store.appendMessage(RoomIdSchema.parse(opts.roomId), msg);
  return msg;
}

interface ReadFeatureMessagesOpts {
  roomId: string;
  since?: string;
  lastN?: number;
}

export async function readFeatureMessages(
  store: RoomStore,
  opts: ReadFeatureMessagesOpts,
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
