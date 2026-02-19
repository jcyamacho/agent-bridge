import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FSRoomStore } from "../store/fs-room-store";
import {
  createRoom,
  listRooms,
  readRoomMessages,
  sendRoomMessage,
} from "./rooms";

let tmpDir: string;
let roomStore: FSRoomStore;
const frontendPeerId = "frontend";
const backendPeerId = "backend";
const featureRoomId = "feature-x";
const chatRoomId = "chat";

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
  roomStore = new FSRoomStore(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("createRoom", () => {
  test("creates room directory and meta", async () => {
    await createRoom(roomStore, {
      roomId: featureRoomId,
      createdBy: frontendPeerId,
      description: "Coordination",
    });
    const meta = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, "rooms", featureRoomId, "meta.json"),
        "utf-8",
      ),
    );
    expect(meta.id).toBe(featureRoomId);
    expect(meta.createdBy).toBe(frontendPeerId);
  });
});

describe("listRooms", () => {
  test("returns all rooms", async () => {
    await createRoom(roomStore, {
      roomId: "room-a",
      createdBy: frontendPeerId,
    });
    await createRoom(roomStore, {
      roomId: "room-b",
      createdBy: backendPeerId,
    });
    const rooms = await listRooms(roomStore);
    expect(rooms).toHaveLength(2);
  });

  test("returns empty when no rooms", async () => {
    expect(await listRooms(roomStore)).toEqual([]);
  });
});

describe("sendRoomMessage + readRoomMessages", () => {
  test("appends and reads messages", async () => {
    await createRoom(roomStore, {
      roomId: chatRoomId,
      createdBy: frontendPeerId,
    });
    await sendRoomMessage(roomStore, {
      roomId: chatRoomId,
      from: frontendPeerId,
      content: "hello",
    });
    await sendRoomMessage(roomStore, {
      roomId: chatRoomId,
      from: backendPeerId,
      content: "hi back",
    });

    const msgs = await readRoomMessages(roomStore, { roomId: chatRoomId });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]?.content).toBe("hello");
    expect(msgs[1]?.content).toBe("hi back");
  });

  test("last_n limits results", async () => {
    await createRoom(roomStore, {
      roomId: chatRoomId,
      createdBy: frontendPeerId,
    });
    for (let i = 0; i < 5; i++) {
      await sendRoomMessage(roomStore, {
        roomId: chatRoomId,
        from: frontendPeerId,
        content: `msg ${i}`,
      });
    }
    const msgs = await readRoomMessages(roomStore, {
      roomId: chatRoomId,
      lastN: 2,
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]?.content).toBe("msg 3");
  });
});
