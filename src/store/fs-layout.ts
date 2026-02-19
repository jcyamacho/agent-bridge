import path from "node:path";
import type { ContextKey, MessageId, PeerId, RoomId } from "../schemas";

export class FSLayout {
  constructor(private readonly baseDir: string) {}

  get peersDir(): string {
    return path.join(this.baseDir, "peers");
  }

  peerFile(peerId: PeerId): string {
    return path.join(this.peersDir, `${peerId}.json`);
  }

  inboxDir(peerId: PeerId): string {
    return path.join(this.baseDir, "inbox", peerId);
  }

  inboxMessageFile(peerId: PeerId, messageId: MessageId): string {
    return path.join(this.inboxDir(peerId), `${messageId}.json`);
  }

  archiveDir(peerId: PeerId): string {
    return path.join(this.inboxDir(peerId), "archive");
  }

  archiveMessageFile(peerId: PeerId, messageId: MessageId): string {
    return path.join(this.archiveDir(peerId), `${messageId}.json`);
  }

  get roomsDir(): string {
    return path.join(this.baseDir, "rooms");
  }

  roomDir(roomId: RoomId): string {
    return path.join(this.roomsDir, roomId);
  }

  roomMetaFile(roomId: RoomId): string {
    return path.join(this.roomDir(roomId), "meta.json");
  }

  roomMessagesFile(roomId: RoomId): string {
    return path.join(this.roomDir(roomId), "messages.jsonl");
  }

  roomContextDir(roomId: RoomId): string {
    return path.join(this.roomDir(roomId), "context");
  }

  roomContextFile(roomId: RoomId, key: ContextKey): string {
    return path.join(this.roomContextDir(roomId), `${key}.md`);
  }
}
