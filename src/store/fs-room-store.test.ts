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
  test("create persists room metadata with open status", async () => {
    const store = new FSRoomStore(tmpDir);
    const meta: RoomMeta = {
      id: roomId("feature-room"),
      createdBy: peerId("frontend"),
      description: "Feature room",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };

    await store.create(meta);

    expect(await store.get(roomId("feature-room"))).toEqual(meta);
  });

  test("close marks room as closed and sets closedAt", async () => {
    const store = new FSRoomStore(tmpDir);
    const id = roomId("feature-room");
    const meta: RoomMeta = {
      id,
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };
    await store.create(meta);

    await store.close(id, "2026-01-02T00:00:00.000Z");

    expect(await store.get(id)).toEqual({
      ...meta,
      status: "closed",
      closedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  test("list excludes closed rooms by default", async () => {
    const store = new FSRoomStore(tmpDir);
    const openMeta: RoomMeta = {
      id: roomId("open-room"),
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };
    const closedMeta: RoomMeta = {
      id: roomId("closed-room"),
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };
    await store.create(openMeta);
    await store.create(closedMeta);
    await store.close(roomId("closed-room"), "2026-01-02T00:00:00.000Z");

    expect(await store.list()).toEqual([openMeta]);
  });

  test("list includes closed rooms when requested", async () => {
    const store = new FSRoomStore(tmpDir);
    const openMeta: RoomMeta = {
      id: roomId("open-room"),
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };
    const closedMeta: RoomMeta = {
      id: roomId("closed-room"),
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };
    await store.create(openMeta);
    await store.create(closedMeta);
    await store.close(roomId("closed-room"), "2026-01-02T00:00:00.000Z");

    expect(await store.list({ includeClosed: true })).toHaveLength(2);
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
      status: "open",
    };
    const message: RoomMessage = {
      id: messageId("rm-1"),
      from: peerId("frontend"),
      content: "hello",
      type: "update",
      createdAt: "2026-01-02T00:00:00.000Z",
    };

    await store.create(meta);
    await store.appendMessage(id, message);

    expect(await store.readMessages(id)).toEqual([message]);
  });

  test("appendMessage rejects when room is closed", async () => {
    const store = new FSRoomStore(tmpDir);
    const id = roomId("chat-room");
    const meta: RoomMeta = {
      id,
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };
    const message: RoomMessage = {
      id: messageId("rm-1"),
      from: peerId("frontend"),
      content: "hello",
      type: "update",
      createdAt: "2026-01-02T00:00:00.000Z",
    };

    await store.create(meta);
    await store.close(id, "2026-01-03T00:00:00.000Z");

    await expect(store.appendMessage(id, message)).rejects.toThrow(
      "Room chat-room is closed",
    );
  });

  test("readMessages throws on malformed json line", async () => {
    const store = new FSRoomStore(tmpDir);
    const id = roomId("chat-room");
    const meta: RoomMeta = {
      id,
      createdBy: peerId("frontend"),
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "open",
    };

    await store.create(meta);
    await fs.appendFile(
      path.join(tmpDir, "rooms", "chat-room", "messages.jsonl"),
      "{bad json}\n",
    );
    expect(store.readMessages(id)).rejects.toThrow();
  });
});
