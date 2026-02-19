import os from "node:os";
import path from "node:path";
import { parseArgs as parseNodeArgs } from "node:util";
import { type PeerId, PeerIdSchema } from "./schemas";

export interface BridgeConfig {
  peerId: PeerId;
  name: string;
  project: string;
  bridgeDir: string;
}

export function parseArgs(argv: string[]): BridgeConfig {
  const { values } = parseNodeArgs({
    args: argv,
    options: {
      "peer-id": { type: "string" },
      name: { type: "string" },
      project: { type: "string" },
      "bridge-dir": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });

  const rawPeerId = values["peer-id"];
  if (!rawPeerId) throw new Error("--peer-id is required");
  const peerId = PeerIdSchema.parse(rawPeerId);

  return {
    peerId,
    name: values.name ?? peerId,
    project: values.project ?? process.cwd(),
    bridgeDir: values["bridge-dir"] ?? path.join(os.homedir(), ".agent-bridge"),
  };
}
