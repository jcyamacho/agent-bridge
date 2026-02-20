import path from "node:path";
import type { ContextKey, PeerId, RoomId } from "../schemas";

export class FSLayout {
  constructor(private readonly baseDir: string) {}

  get peersDir(): string {
    return path.join(this.baseDir, "peers");
  }

  peerFile(peerId: PeerId): string {
    return path.join(this.peersDir, `${peerId}.json`);
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
