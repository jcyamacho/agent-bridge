import { ContextKeySchema, RoomIdSchema } from "../schemas";
import type { ContextStore, RoomStore } from "../store/contracts";

interface PutFeatureContextOpts {
  roomId: string;
  key: string;
  content: string;
}

async function assertRoomIsOpen(
  roomStore: Pick<RoomStore, "get">,
  roomId: string,
): Promise<void> {
  const parsedRoomId = RoomIdSchema.parse(roomId);
  const room = await roomStore.get(parsedRoomId);
  if (!room) throw new Error(`Room ${parsedRoomId} not found`);
  if (room.status === "closed")
    throw new Error(`Room ${parsedRoomId} is closed`);
}

export async function putFeatureContext(
  contextStore: ContextStore,
  roomStore: Pick<RoomStore, "get">,
  opts: PutFeatureContextOpts,
): Promise<void> {
  await assertRoomIsOpen(roomStore, opts.roomId);
  await contextStore.put(
    RoomIdSchema.parse(opts.roomId),
    ContextKeySchema.parse(opts.key),
    opts.content,
  );
}

export async function getFeatureContext(
  store: ContextStore,
  opts: { roomId: string; key: string },
): Promise<string> {
  return store.get(
    RoomIdSchema.parse(opts.roomId),
    ContextKeySchema.parse(opts.key),
  );
}

export async function listFeatureContextKeys(
  store: ContextStore,
  opts: { roomId: string },
): Promise<string[]> {
  return store.listKeys(RoomIdSchema.parse(opts.roomId));
}
