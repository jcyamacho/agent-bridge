import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { registerPeer, listPeers } from "./peers";
import { BridgePaths } from "../fs/paths";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let tmpDir: string;
let paths: BridgePaths;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
  paths = new BridgePaths(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("registerPeer", () => {
  test("creates peer file on first registration", async () => {
    await registerPeer(paths, {
      peerId: "frontend",
      name: "Frontend App",
      project: "/repos/web",
    });
    const content = JSON.parse(
      await fs.readFile(paths.peerFile("frontend"), "utf-8")
    );
    expect(content.id).toBe("frontend");
    expect(content.name).toBe("Frontend App");
    expect(content.project).toBe("/repos/web");
    expect(content.registeredAt).toBeDefined();
    expect(content.lastSeenAt).toBeDefined();
  });

  test("updates lastSeenAt on re-registration", async () => {
    await registerPeer(paths, { peerId: "frontend", name: "V1" });
    const first = JSON.parse(
      await fs.readFile(paths.peerFile("frontend"), "utf-8")
    );

    await new Promise((r) => setTimeout(r, 10));
    await registerPeer(paths, { peerId: "frontend", name: "V2" });
    const second = JSON.parse(
      await fs.readFile(paths.peerFile("frontend"), "utf-8")
    );

    expect(second.name).toBe("V2");
    expect(second.registeredAt).toBe(first.registeredAt);
    expect(second.lastSeenAt).not.toBe(first.lastSeenAt);
  });
});

describe("listPeers", () => {
  test("returns empty list when no peers", async () => {
    const peers = await listPeers(paths, "frontend");
    expect(peers).toEqual([]);
  });

  test("returns other peers, excluding self", async () => {
    await registerPeer(paths, { peerId: "frontend" });
    await registerPeer(paths, { peerId: "backend" });
    const peers = await listPeers(paths, "frontend");
    expect(peers).toHaveLength(1);
    expect(peers[0]!.id).toBe("backend");
  });
});
