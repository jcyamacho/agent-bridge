import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ContextKeySchema, RoomIdSchema } from "../schemas";
import { FSContextStore } from "./fs-context-store";

const roomId = (value: string) => RoomIdSchema.parse(value);
const contextKey = (value: string) => ContextKeySchema.parse(value);

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-context-store-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FSContextStore", () => {
  test("put and get roundtrip", async () => {
    const store = new FSContextStore(tmpDir);

    await store.put(roomId("feature-room"), contextKey("api-spec"), "# spec");

    expect(
      await store.get(roomId("feature-room"), contextKey("api-spec")),
    ).toBe("# spec");
  });

  test("listKeys returns [] for missing room", async () => {
    const store = new FSContextStore(tmpDir);
    expect(await store.listKeys(roomId("missing-room"))).toEqual([]);
  });

  test("listKeys only includes .md files with valid keys", async () => {
    const store = new FSContextStore(tmpDir);
    const contextDir = path.join(tmpDir, "rooms", "feature-room", "context");
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(path.join(contextDir, "api-spec.md"), "ok");
    await fs.writeFile(path.join(contextDir, ".md"), "invalid key");
    await fs.writeFile(path.join(contextDir, "ignore.txt"), "ignore");

    expect(await store.listKeys(roomId("feature-room"))).toEqual([
      contextKey("api-spec"),
    ]);
  });
});
