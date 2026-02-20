import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FSRoomStore } from "../store/fs-room-store";
import {
  closeFeatureRoom,
  listFeatureRooms,
  openFeatureRoom,
  postFeatureMessage,
  readFeatureMessages,
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

describe("openFeatureRoom", () => {
  test("creates room directory and meta", async () => {
    await openFeatureRoom(roomStore, {
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
    expect(meta.status).toBe("open");
  });
});

describe("listFeatureRooms", () => {
  test("returns only open rooms by default", async () => {
    await openFeatureRoom(roomStore, {
      roomId: "room-a",
      createdBy: frontendPeerId,
    });
    await openFeatureRoom(roomStore, {
      roomId: "room-b",
      createdBy: backendPeerId,
    });
    await closeFeatureRoom(roomStore, {
      roomId: "room-b",
    });

    const rooms = await listFeatureRooms(roomStore);
    expect(rooms).toHaveLength(1);
    expect(String(rooms[0]?.id)).toBe("room-a");
  });

  test("returns closed rooms when include_closed is true", async () => {
    await openFeatureRoom(roomStore, {
      roomId: "room-a",
      createdBy: frontendPeerId,
    });
    await openFeatureRoom(roomStore, {
      roomId: "room-b",
      createdBy: backendPeerId,
    });
    await closeFeatureRoom(roomStore, {
      roomId: "room-b",
    });

    const rooms = await listFeatureRooms(roomStore, {
      includeClosed: true,
    });
    expect(rooms).toHaveLength(2);
  });
});

describe("postFeatureMessage + readFeatureMessages", () => {
  test("appends and reads typed feature messages", async () => {
    await openFeatureRoom(roomStore, {
      roomId: chatRoomId,
      createdBy: frontendPeerId,
    });
    await postFeatureMessage(roomStore, {
      roomId: chatRoomId,
      from: frontendPeerId,
      content: "API ready",
      type: "update",
    });
    await postFeatureMessage(roomStore, {
      roomId: chatRoomId,
      from: backendPeerId,
      content: "Need auth clarification",
      type: "question",
    });

    const msgs = await readFeatureMessages(roomStore, { roomId: chatRoomId });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]?.type).toBe("update");
    expect(msgs[1]?.type).toBe("question");
  });

  test("last_n limits results", async () => {
    await openFeatureRoom(roomStore, {
      roomId: chatRoomId,
      createdBy: frontendPeerId,
    });
    for (let i = 0; i < 5; i++) {
      await postFeatureMessage(roomStore, {
        roomId: chatRoomId,
        from: frontendPeerId,
        content: `msg ${i}`,
        type: "update",
      });
    }
    const msgs = await readFeatureMessages(roomStore, {
      roomId: chatRoomId,
      lastN: 2,
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]?.content).toBe("msg 3");
  });

  test("rejects writes to closed rooms", async () => {
    await openFeatureRoom(roomStore, {
      roomId: chatRoomId,
      createdBy: frontendPeerId,
    });
    await closeFeatureRoom(roomStore, {
      roomId: chatRoomId,
    });

    await expect(
      postFeatureMessage(roomStore, {
        roomId: chatRoomId,
        from: frontendPeerId,
        content: "late update",
        type: "update",
      }),
    ).rejects.toThrow("Room chat is closed");
  });
});
