import fs from "node:fs/promises";
import { atomicWriteJson, readJson } from "../fs/atomic";
import { type Peer, type PeerId, PeerIdSchema, PeerSchema } from "../schemas";
import type { PeerStore, PeerUpsertInput } from "./contracts";
import { FSLayout } from "./fs-layout";

export class FSPeerStore implements PeerStore {
  private readonly layout: FSLayout;

  constructor(baseDir: string) {
    this.layout = new FSLayout(baseDir);
  }

  async get(id: PeerId): Promise<Peer | undefined> {
    const raw = await readJson<unknown>(this.layout.peerFile(id));
    const parsed = PeerSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  }

  async upsert(input: PeerUpsertInput): Promise<Peer> {
    const existing = await this.get(input.id);
    const peer: Peer = {
      id: input.id,
      name: input.name ?? existing?.name,
      project: input.project ?? existing?.project,
      description: input.description ?? existing?.description,
      registeredAt:
        existing?.registeredAt ?? input.registeredAt ?? input.lastSeenAt,
      lastSeenAt: input.lastSeenAt,
    };

    await atomicWriteJson(this.layout.peerFile(input.id), peer);
    return peer;
  }

  async list(): Promise<Peer[]> {
    const ids = await this.listIds();
    const peers: Peer[] = [];

    for (const id of ids) {
      const peer = await this.get(id);
      if (peer) peers.push(peer);
    }

    return peers;
  }

  async listIds(): Promise<PeerId[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.layout.peersDir);
    } catch {
      return [];
    }

    const ids: PeerId[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const parsed = PeerIdSchema.safeParse(file.replace(/\.json$/, ""));
      if (parsed.success) ids.push(parsed.data);
    }

    return ids;
  }
}
