import type {
  ContextKey,
  Peer,
  PeerId,
  RoomId,
  RoomMessage,
  RoomMeta,
} from "../schemas";

export interface PeerUpsertInput {
  id: PeerId;
  name?: string;
  project?: string;
  description?: string;
  registeredAt?: string;
  lastSeenAt: string;
}

export interface PeerStore {
  get(id: PeerId): Promise<Peer | undefined>;
  upsert(input: PeerUpsertInput): Promise<Peer>;
  list(): Promise<Peer[]>;
  listIds(): Promise<PeerId[]>;
}

export interface ListRoomsOptions {
  includeClosed?: boolean;
}

export interface RoomStore {
  create(meta: RoomMeta): Promise<void>;
  close(roomId: RoomId, closedAt: string): Promise<RoomMeta>;
  get(roomId: RoomId): Promise<RoomMeta | undefined>;
  list(options?: ListRoomsOptions): Promise<RoomMeta[]>;
  appendMessage(roomId: RoomId, message: RoomMessage): Promise<void>;
  readMessages(roomId: RoomId): Promise<RoomMessage[]>;
}

export interface ContextStore {
  put(roomId: RoomId, key: ContextKey, content: string): Promise<void>;
  get(roomId: RoomId, key: ContextKey): Promise<string>;
  listKeys(roomId: RoomId): Promise<ContextKey[]>;
}
