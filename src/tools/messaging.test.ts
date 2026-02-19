import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FSMessageStore } from "../store/fs-message-store";
import { FSPeerStore } from "../store/fs-peer-store";
import { checkInbox, reply, sendMessage } from "./messaging";
import { registerPeer } from "./peers";

let tmpDir: string;
let peerStore: FSPeerStore;
let messageStore: FSMessageStore;
const frontendPeerId = "frontend";
const backendPeerId = "backend";
const mobilePeerId = "mobile";

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
  peerStore = new FSPeerStore(tmpDir);
  messageStore = new FSMessageStore(tmpDir);
  await registerPeer(peerStore, { peerId: frontendPeerId });
  await registerPeer(peerStore, { peerId: backendPeerId });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("sendMessage", () => {
  test("delivers message to recipient inbox", async () => {
    const msg = await sendMessage(messageStore, peerStore, {
      from: frontendPeerId,
      to: backendPeerId,
      content: "What does GET /users/:id return?",
      type: "question",
    });
    expect(msg.id).toMatch(/^msg_\d+_[a-f0-9]+$/);
    const files = await fs.readdir(path.join(tmpDir, "inbox", backendPeerId));
    expect(files.length).toBe(1);
  });

  test("broadcasts to all peers except sender", async () => {
    await registerPeer(peerStore, { peerId: mobilePeerId });
    await sendMessage(messageStore, peerStore, {
      from: frontendPeerId,
      to: "all",
      content: "Breaking change!",
      type: "announcement",
    });
    const backendInbox = await fs.readdir(
      path.join(tmpDir, "inbox", backendPeerId),
    );
    const mobileInbox = await fs.readdir(
      path.join(tmpDir, "inbox", mobilePeerId),
    );
    const frontendFiles = await fs
      .readdir(path.join(tmpDir, "inbox", frontendPeerId))
      .catch(() => []);
    expect(backendInbox.length).toBe(1);
    expect(mobileInbox.length).toBe(1);
    expect(
      frontendFiles.filter((f: string) => f.endsWith(".json")).length,
    ).toBe(0);
  });
});

describe("checkInbox", () => {
  test("returns unread messages and marks as read", async () => {
    await sendMessage(messageStore, peerStore, {
      from: frontendPeerId,
      to: backendPeerId,
      content: "hi",
      type: "question",
    });
    const messages = await checkInbox(messageStore, backendPeerId);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.status).toBe("read");

    const files = await fs.readdir(path.join(tmpDir, "inbox", backendPeerId));
    const jsonFiles = files.filter((f: string) => f.endsWith(".json"));
    expect(jsonFiles.length).toBe(1);
  });

  test("returns empty for no messages", async () => {
    const messages = await checkInbox(messageStore, backendPeerId);
    expect(messages).toHaveLength(0);
  });
});

describe("reply", () => {
  test("sends reply and archives original", async () => {
    const original = await sendMessage(messageStore, peerStore, {
      from: frontendPeerId,
      to: backendPeerId,
      content: "question?",
      type: "question",
    });
    await checkInbox(messageStore, backendPeerId);

    await reply(messageStore, {
      from: backendPeerId,
      messageId: original.id,
      content: "answer!",
    });

    const frontendMsgs = await checkInbox(messageStore, frontendPeerId);
    expect(frontendMsgs).toHaveLength(1);
    expect(frontendMsgs[0]?.type).toBe("reply");
    expect(frontendMsgs[0]?.replyTo).toBe(original.id);

    const archiveFiles = await fs.readdir(
      path.join(tmpDir, "inbox", backendPeerId, "archive"),
    );
    expect(archiveFiles.length).toBe(1);
  });
});
