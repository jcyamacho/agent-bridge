import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FSContextStore } from "../store/fs-context-store";
import { FSRoomStore } from "../store/fs-room-store";
import {
  getFeatureContext,
  listFeatureContextKeys,
  putFeatureContext,
} from "./context";
import { closeFeatureRoom, openFeatureRoom } from "./rooms";

let tmpDir: string;
let contextStore: FSContextStore;
let roomStore: FSRoomStore;
const roomId = "feature";

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
  contextStore = new FSContextStore(tmpDir);
  roomStore = new FSRoomStore(tmpDir);
  await openFeatureRoom(roomStore, { roomId, createdBy: "frontend" });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("putFeatureContext + getFeatureContext", () => {
  test("writes and reads context markdown", async () => {
    await putFeatureContext(contextStore, roomStore, {
      roomId,
      key: "user-schema",
      content: "# User\n- id: string",
    });
    const content = await getFeatureContext(contextStore, {
      roomId,
      key: "user-schema",
    });
    expect(content).toBe("# User\n- id: string");
  });

  test("overwrites existing context", async () => {
    await putFeatureContext(contextStore, roomStore, {
      roomId,
      key: "api",
      content: "v1",
    });
    await putFeatureContext(contextStore, roomStore, {
      roomId,
      key: "api",
      content: "v2",
    });
    expect(await getFeatureContext(contextStore, { roomId, key: "api" })).toBe(
      "v2",
    );
  });

  test("rejects writes to closed rooms", async () => {
    await closeFeatureRoom(roomStore, { roomId });

    await expect(
      putFeatureContext(contextStore, roomStore, {
        roomId,
        key: "api",
        content: "v2",
      }),
    ).rejects.toThrow("Room feature is closed");
  });
});

describe("listFeatureContextKeys", () => {
  test("lists all context keys", async () => {
    await putFeatureContext(contextStore, roomStore, {
      roomId,
      key: "schema",
      content: "...",
    });
    await putFeatureContext(contextStore, roomStore, {
      roomId,
      key: "auth",
      content: "...",
    });
    const keys = await listFeatureContextKeys(contextStore, { roomId });
    expect(keys.sort()).toEqual(["auth", "schema"]);
  });

  test("returns empty when no context", async () => {
    expect(await listFeatureContextKeys(contextStore, { roomId })).toEqual([]);
  });
});
