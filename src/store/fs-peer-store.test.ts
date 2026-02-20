import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PeerIdSchema } from "../schemas";
import { FSPeerStore } from "./fs-peer-store";

const peerId = (value: string) => PeerIdSchema.parse(value);

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-peer-store-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FSPeerStore", () => {
  test("upsert preserves existing optional fields", async () => {
    const store = new FSPeerStore(tmpDir);

    await store.upsert({
      id: peerId("frontend"),
      name: "Frontend Team",
      project: "web-app",
      description: "UI owners",
      registeredAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    });

    const updated = await store.upsert({
      id: peerId("frontend"),
      lastSeenAt: "2026-01-02T00:00:00.000Z",
    });

    expect(updated.name).toBe("Frontend Team");
    expect(updated.project).toBe("web-app");
    expect(updated.description).toBe("UI owners");
    expect(updated.registeredAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.lastSeenAt).toBe("2026-01-02T00:00:00.000Z");
  });

  test("listIds ignores non-json files", async () => {
    await fs.mkdir(path.join(tmpDir, "peers"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "peers", "frontend.json"), "{}");
    await fs.writeFile(path.join(tmpDir, "peers", "README.txt"), "ignore");

    const store = new FSPeerStore(tmpDir);
    expect(await store.listIds()).toEqual([peerId("frontend")]);
  });

  test("list returns persisted peers", async () => {
    const store = new FSPeerStore(tmpDir);
    await store.upsert({
      id: peerId("frontend"),
      name: "Frontend Team",
      lastSeenAt: "2026-01-02T00:00:00.000Z",
    });

    const peers = await store.list();
    expect(peers).toHaveLength(1);
    expect(peers[0]).toMatchObject({
      id: peerId("frontend"),
      name: "Frontend Team",
    });
  });
});
