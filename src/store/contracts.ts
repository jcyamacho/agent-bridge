import type {
  ContextKey,
  Message,
  MessageId,
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

export interface MessageStore {
  putInbox(peerId: PeerId, message: Message): Promise<void>;
  getInbox(peerId: PeerId, messageId: MessageId): Promise<Message | undefined>;
  listInbox(peerId: PeerId): Promise<Message[]>;
  updateInbox(
    peerId: PeerId,
    messageId: MessageId,
    patch: Partial<Message>,
  ): Promise<Message | undefined>;
  archiveInbox(peerId: PeerId, messageId: MessageId): Promise<void>;
}

export interface RoomStore {
  create(meta: RoomMeta): Promise<void>;
  get(roomId: RoomId): Promise<RoomMeta | undefined>;
  list(): Promise<RoomMeta[]>;
  appendMessage(roomId: RoomId, message: RoomMessage): Promise<void>;
  readMessages(roomId: RoomId): Promise<RoomMessage[]>;
}

export interface ContextStore {
  put(roomId: RoomId, key: ContextKey, content: string): Promise<void>;
  get(roomId: RoomId, key: ContextKey): Promise<string>;
  listKeys(roomId: RoomId): Promise<ContextKey[]>;
}
