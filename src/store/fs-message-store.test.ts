import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  type Message,
  MessageIdSchema,
  MessageSchema,
  PeerIdSchema,
} from "../schemas";
import { FSMessageStore } from "./fs-message-store";

const peerId = (value: string) => PeerIdSchema.parse(value);
const messageId = (value: string) => MessageIdSchema.parse(value);
const frontend = peerId("frontend");
const backend = peerId("backend");

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-message-store-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FSMessageStore", () => {
  test("listInbox sorts by createdAt", async () => {
    const store = new FSMessageStore(tmpDir);
    const oldMessage: Message = {
      id: messageId("m-1"),
      from: frontend,
      to: backend,
      type: "question",
      content: "first",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "unread",
    };
    const newMessage: Message = {
      id: messageId("m-2"),
      from: frontend,
      to: backend,
      type: "question",
      content: "second",
      createdAt: "2026-01-02T00:00:00.000Z",
      status: "unread",
    };

    await store.putInbox(backend, newMessage);
    await store.putInbox(backend, oldMessage);

    const list = await store.listInbox(backend);
    expect(list.map((msg) => msg.id)).toEqual([
      messageId("m-1"),
      messageId("m-2"),
    ]);
  });

  test("updateInbox returns undefined for missing message", async () => {
    const store = new FSMessageStore(tmpDir);
    const result = await store.updateInbox(backend, messageId("missing"), {
      status: "read",
    });

    expect(result).toBeUndefined();
  });

  test("archiveInbox moves message into archive folder", async () => {
    const store = new FSMessageStore(tmpDir);
    const msgId = messageId("m-archive");
    const message: Message = {
      id: msgId,
      from: frontend,
      to: backend,
      type: "announcement",
      content: "heads up",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "unread",
    };

    await store.putInbox(backend, message);
    await store.archiveInbox(backend, msgId);

    expect(
      fs.readFile(
        path.join(tmpDir, "inbox", "backend", "m-archive.json"),
        "utf-8",
      ),
    ).rejects.toThrow();

    const archived = MessageSchema.parse(
      JSON.parse(
        await fs.readFile(
          path.join(tmpDir, "inbox", "backend", "archive", "m-archive.json"),
          "utf-8",
        ),
      ),
    );
    expect(archived.id).toBe(msgId);
    expect(await store.listInbox(backend)).toEqual([]);
  });
});
