import type { Peer } from "../schemas";
import { PeerIdSchema } from "../schemas";
import type { PeerStore } from "../store/contracts";

interface RegisterOpts {
  peerId: string;
  name?: string;
  project?: string;
  description?: string;
}

export async function registerPeer(
  store: PeerStore,
  opts: RegisterOpts,
): Promise<Peer> {
  const peerId = PeerIdSchema.parse(opts.peerId);
  const now = new Date().toISOString();

  return store.upsert({
    id: peerId,
    name: opts.name,
    project: opts.project,
    description: opts.description,
    registeredAt: now,
    lastSeenAt: now,
  });
}

export async function listPeers(
  store: PeerStore,
  selfId: string,
): Promise<Peer[]> {
  const selfPeerId = PeerIdSchema.parse(selfId);
  const peers = await store.list();
  return peers.filter((peer) => peer.id !== selfPeerId);
}
