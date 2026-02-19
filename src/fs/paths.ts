import path from "node:path";

export class BridgePaths {
  constructor(private readonly baseDir: string) {}

  get peersDir(): string {
    return path.join(this.baseDir, "peers");
  }

  peerFile(peerId: string): string {
    return path.join(this.peersDir, `${peerId}.json`);
  }

  inboxDir(peerId: string): string {
    return path.join(this.baseDir, "inbox", peerId);
  }

  archiveDir(peerId: string): string {
    return path.join(this.inboxDir(peerId), "archive");
  }

  get roomsDir(): string {
    return path.join(this.baseDir, "rooms");
  }

  roomDir(roomName: string): string {
    return path.join(this.roomsDir, roomName);
  }

  roomMetaFile(roomName: string): string {
    return path.join(this.roomDir(roomName), "meta.json");
  }

  roomMessagesFile(roomName: string): string {
    return path.join(this.roomDir(roomName), "messages.jsonl");
  }

  roomContextDir(roomName: string): string {
    return path.join(this.roomDir(roomName), "context");
  }

  roomContextFile(roomName: string, key: string): string {
    return path.join(this.roomContextDir(roomName), `${key}.md`);
  }
}
