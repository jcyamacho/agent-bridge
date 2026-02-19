import os from "node:os";
import path from "node:path";
import { type PeerId, PeerIdSchema } from "./schemas";

export interface BridgeConfig {
  peerId: PeerId;
  name: string;
  project: string;
  bridgeDir: string;
}

export function parseArgs(argv: string[]): BridgeConfig {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };

  const rawPeerId = get("--peer-id");
  if (!rawPeerId) throw new Error("--peer-id is required");
  const peerId = PeerIdSchema.parse(rawPeerId);

  return {
    peerId,
    name: get("--name") ?? peerId,
    project: get("--project") ?? process.cwd(),
    bridgeDir: get("--bridge-dir") ?? path.join(os.homedir(), ".agent-bridge"),
  };
}
