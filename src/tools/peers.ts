import fs from "node:fs/promises";
import type { BridgePaths } from "../fs/paths";
import type { Peer } from "../schemas";
import { atomicWriteJson, readJson } from "../fs/atomic";

interface RegisterOpts {
  peerId: string;
  name?: string;
  project?: string;
  description?: string;
}

export async function registerPeer(paths: BridgePaths, opts: RegisterOpts): Promise<Peer> {
  const existing = await readJson<Peer>(paths.peerFile(opts.peerId));
  const now = new Date().toISOString();

  const peer: Peer = {
    id: opts.peerId,
    name: opts.name ?? existing?.name,
    project: opts.project ?? existing?.project,
    description: opts.description ?? existing?.description,
    registeredAt: existing?.registeredAt ?? now,
    lastSeenAt: now,
  };

  await atomicWriteJson(paths.peerFile(opts.peerId), peer);
  return peer;
}

export async function listPeers(paths: BridgePaths, selfId: string): Promise<Peer[]> {
  let files: string[];
  try {
    files = await fs.readdir(paths.peersDir);
  } catch {
    return [];
  }

  const peers: Peer[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const peer = await readJson<Peer>(`${paths.peersDir}/${file}`);
    if (peer && peer.id !== selfId) peers.push(peer);
  }
  return peers;
}
