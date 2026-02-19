import { ContextKeySchema, RoomIdSchema } from "../schemas";
import type { ContextStore } from "../store/contracts";

interface PostContextOpts {
  roomId: string;
  key: string;
  content: string;
}

export async function postContext(
  store: ContextStore,
  opts: PostContextOpts,
): Promise<void> {
  await store.put(
    RoomIdSchema.parse(opts.roomId),
    ContextKeySchema.parse(opts.key),
    opts.content,
  );
}

export async function readContext(
  store: ContextStore,
  opts: { roomId: string; key: string },
): Promise<string> {
  return store.get(
    RoomIdSchema.parse(opts.roomId),
    ContextKeySchema.parse(opts.key),
  );
}

export async function listContext(
  store: ContextStore,
  opts: { roomId: string },
): Promise<string[]> {
  return store.listKeys(RoomIdSchema.parse(opts.roomId));
}
