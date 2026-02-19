import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { sendMessage, checkInbox, reply } from "./messaging";
import { registerPeer } from "./peers";
import { BridgePaths } from "../fs/paths";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let tmpDir: string;
let paths: BridgePaths;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
  paths = new BridgePaths(tmpDir);
  await registerPeer(paths, { peerId: "frontend" });
  await registerPeer(paths, { peerId: "backend" });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("sendMessage", () => {
  test("delivers message to recipient inbox", async () => {
    const msg = await sendMessage(paths, {
      from: "frontend",
      to: "backend",
      content: "What does GET /users/:id return?",
      type: "question",
    });
    expect(msg.id).toMatch(/^msg_\d+_[a-f0-9]+$/);
    const files = await fs.readdir(paths.inboxDir("backend"));
    expect(files.length).toBe(1);
  });

  test("broadcasts to all peers except sender", async () => {
    await registerPeer(paths, { peerId: "mobile" });
    await sendMessage(paths, {
      from: "frontend",
      to: "all",
      content: "Breaking change!",
      type: "announcement",
    });
    const backendInbox = await fs.readdir(paths.inboxDir("backend"));
    const mobileInbox = await fs.readdir(paths.inboxDir("mobile"));
    const frontendFiles = await fs.readdir(paths.inboxDir("frontend")).catch(() => []);
    expect(backendInbox.length).toBe(1);
    expect(mobileInbox.length).toBe(1);
    expect(frontendFiles.filter((f: string) => f.endsWith(".json")).length).toBe(0);
  });
});

describe("checkInbox", () => {
  test("returns unread messages and marks as read", async () => {
    await sendMessage(paths, { from: "frontend", to: "backend", content: "hi", type: "question" });
    const messages = await checkInbox(paths, "backend");
    expect(messages).toHaveLength(1);
    expect(messages[0]!.status).toBe("read");

    const files = await fs.readdir(paths.inboxDir("backend"));
    const jsonFiles = files.filter((f: string) => f.endsWith(".json"));
    expect(jsonFiles.length).toBe(1);
  });

  test("returns empty for no messages", async () => {
    const messages = await checkInbox(paths, "backend");
    expect(messages).toHaveLength(0);
  });
});

describe("reply", () => {
  test("sends reply and archives original", async () => {
    const original = await sendMessage(paths, {
      from: "frontend", to: "backend", content: "question?", type: "question",
    });
    await checkInbox(paths, "backend");

    await reply(paths, {
      from: "backend",
      messageId: original.id,
      content: "answer!",
    });

    const frontendMsgs = await checkInbox(paths, "frontend");
    expect(frontendMsgs).toHaveLength(1);
    expect(frontendMsgs[0]!.type).toBe("reply");
    expect(frontendMsgs[0]!.replyTo).toBe(original.id);

    const archiveFiles = await fs.readdir(paths.archiveDir("backend"));
    expect(archiveFiles.length).toBe(1);
  });
});
