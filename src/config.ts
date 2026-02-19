import path from "node:path";
import os from "node:os";

export interface BridgeConfig {
  peerId: string;
  name: string;
  project: string;
  bridgeDir: string;
}

export function parseArgs(argv: string[]): BridgeConfig {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };

  const peerId = get("--peer-id");
  if (!peerId) throw new Error("--peer-id is required");

  return {
    peerId,
    name: get("--name") ?? peerId,
    project: get("--project") ?? process.cwd(),
    bridgeDir: get("--bridge-dir") ?? path.join(os.homedir(), ".agent-bridge"),
  };
}
