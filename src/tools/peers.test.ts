import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FSPeerStore } from "../store/fs-peer-store";
import { listPeers, registerPeer } from "./peers";

let tmpDir: string;
let store: FSPeerStore;
const frontendPeerId = "frontend";
const backendPeerId = "backend";

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
  store = new FSPeerStore(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("registerPeer", () => {
  test("creates peer file on first registration", async () => {
    await registerPeer(store, {
      peerId: frontendPeerId,
      name: "Frontend App",
      project: "/repos/web",
    });
    const content = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, "peers", `${frontendPeerId}.json`),
        "utf-8",
      ),
    );
    expect(content.id).toBe(frontendPeerId);
    expect(content.name).toBe("Frontend App");
    expect(content.project).toBe("/repos/web");
    expect(content.registeredAt).toBeDefined();
    expect(content.lastSeenAt).toBeDefined();
  });

  test("updates lastSeenAt on re-registration", async () => {
    await registerPeer(store, { peerId: frontendPeerId, name: "V1" });
    const first = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, "peers", `${frontendPeerId}.json`),
        "utf-8",
      ),
    );

    await new Promise((r) => setTimeout(r, 10));
    await registerPeer(store, { peerId: frontendPeerId, name: "V2" });
    const second = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, "peers", `${frontendPeerId}.json`),
        "utf-8",
      ),
    );

    expect(second.name).toBe("V2");
    expect(second.registeredAt).toBe(first.registeredAt);
    expect(second.lastSeenAt).not.toBe(first.lastSeenAt);
  });
});

describe("listPeers", () => {
  test("returns empty list when no peers", async () => {
    const peers = await listPeers(store, frontendPeerId);
    expect(peers).toEqual([]);
  });

  test("returns other peers, excluding self", async () => {
    await registerPeer(store, { peerId: frontendPeerId });
    await registerPeer(store, { peerId: backendPeerId });
    const peers = await listPeers(store, frontendPeerId);
    expect(peers).toHaveLength(1);
    expect(String(peers[0]?.id)).toBe(backendPeerId);
  });
});
