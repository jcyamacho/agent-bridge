import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  MessageIdSchema,
  PeerIdSchema,
  RoomIdSchema,
  type RoomMessage,
  type RoomMeta,
} from "../schemas";
import { FSRoomStore } from "./fs-room-store";

const peerId = (value: string) => PeerIdSchema.parse(value);
const roomId = (value: string) => RoomIdSchema.parse(value);
const messageId = (value: string) => MessageIdSchema.parse(value);

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-room-store-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FSRoomStore", () => {
  test("create persists room metadata", async () => {
    const store = new FSRoomStore(tmpDir);
    const meta: RoomMeta = {
      id: roomId("feature-room"),
      createdBy: peerId("frontend"),
      description: "Feature room",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    await store.create(meta);

    expect(await store.get(roomId("feature-room"))).toEqual(meta);
    expect(await store.list()).toEqual([meta]);
  });

  test("readMessages returns [] when room file is missing", async () => {
    const store = new FSRoomStore(tmpDir);
    expect(await store.readMessages(roomId("missing-room"))).toEqual([]);
  });

  test("appendMessage and readMessages roundtrip", async () => {
    const store = new FSRoomStore(tmpDir);
    const id = roomId("chat-room");
    const meta: RoomMeta = {
      id,
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const message: RoomMessage = {
      id: messageId("rm-1"),
      from: peerId("frontend"),
      content: "hello",
      createdAt: "2026-01-02T00:00:00.000Z",
    };

    await store.create(meta);
    await store.appendMessage(id, message);

    expect(await store.readMessages(id)).toEqual([message]);
  });

  test("readMessages throws on malformed json line", async () => {
    const store = new FSRoomStore(tmpDir);
    const id = roomId("chat-room");
    const meta: RoomMeta = {
      id,
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    await store.create(meta);
    await fs.appendFile(
      path.join(tmpDir, "rooms", "chat-room", "messages.jsonl"),
      "{bad json}\n",
    );
    expect(store.readMessages(id)).rejects.toThrow();
  });
});
