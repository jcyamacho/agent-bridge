import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { createRoom, listRooms, sendRoomMessage, readRoomMessages } from "./rooms";
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

describe("createRoom", () => {
  test("creates room directory and meta", async () => {
    await createRoom(paths, { name: "feature-x", createdBy: "frontend", description: "Coordination" });
    const meta = JSON.parse(await fs.readFile(paths.roomMetaFile("feature-x"), "utf-8"));
    expect(meta.name).toBe("feature-x");
    expect(meta.createdBy).toBe("frontend");
  });
});

describe("listRooms", () => {
  test("returns all rooms", async () => {
    await createRoom(paths, { name: "room-a", createdBy: "frontend" });
    await createRoom(paths, { name: "room-b", createdBy: "backend" });
    const rooms = await listRooms(paths);
    expect(rooms).toHaveLength(2);
  });

  test("returns empty when no rooms", async () => {
    expect(await listRooms(paths)).toEqual([]);
  });
});

describe("sendRoomMessage + readRoomMessages", () => {
  test("appends and reads messages", async () => {
    await createRoom(paths, { name: "chat", createdBy: "frontend" });
    await sendRoomMessage(paths, { room: "chat", from: "frontend", content: "hello" });
    await sendRoomMessage(paths, { room: "chat", from: "backend", content: "hi back" });

    const msgs = await readRoomMessages(paths, { room: "chat" });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.content).toBe("hello");
    expect(msgs[1]!.content).toBe("hi back");
  });

  test("last_n limits results", async () => {
    await createRoom(paths, { name: "chat", createdBy: "frontend" });
    for (let i = 0; i < 5; i++) {
      await sendRoomMessage(paths, { room: "chat", from: "frontend", content: `msg ${i}` });
    }
    const msgs = await readRoomMessages(paths, { room: "chat", lastN: 2 });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.content).toBe("msg 3");
  });
});
