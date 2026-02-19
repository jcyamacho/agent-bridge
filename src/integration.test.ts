import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { BridgePaths } from "./fs/paths";
import { registerPeer, listPeers } from "./tools/peers";
import { sendMessage, checkInbox, reply } from "./tools/messaging";
import { createRoom, sendRoomMessage, readRoomMessages } from "./tools/rooms";
import { postContext, readContext, listContext } from "./tools/context";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let tmpDir: string;
let paths: BridgePaths;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-integration-"));
  paths = new BridgePaths(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("full workflow: question → answer", () => {
  test("frontend asks backend, backend replies", async () => {
    await registerPeer(paths, { peerId: "frontend", name: "Frontend" });
    await registerPeer(paths, { peerId: "backend", name: "Backend API" });

    const peers = await listPeers(paths, "frontend");
    expect(peers).toHaveLength(1);
    expect(peers[0]!.id).toBe("backend");

    const question = await sendMessage(paths, {
      from: "frontend",
      to: "backend",
      content: "What does GET /users/:id return?",
      type: "question",
    });

    const backendInbox = await checkInbox(paths, "backend");
    expect(backendInbox).toHaveLength(1);
    expect(backendInbox[0]!.content).toContain("GET /users/:id");

    await reply(paths, {
      from: "backend",
      messageId: question.id,
      content: "Returns { id, name, email }",
    });

    const frontendInbox = await checkInbox(paths, "frontend");
    expect(frontendInbox).toHaveLength(1);
    expect(frontendInbox[0]!.content).toContain("id, name, email");
    expect(frontendInbox[0]!.replyTo).toBe(question.id);
  });
});

describe("full workflow: shared context via room", () => {
  test("backend shares API schema, frontend reads it", async () => {
    await registerPeer(paths, { peerId: "frontend" });
    await registerPeer(paths, { peerId: "backend" });

    await createRoom(paths, {
      name: "user-feature",
      createdBy: "backend",
      description: "User feature coordination",
    });
    await postContext(paths, {
      room: "user-feature",
      key: "user-endpoints",
      content: "## GET /users/:id\nReturns { id, name, email }",
    });

    const keys = await listContext(paths, { room: "user-feature" });
    expect(keys).toContain("user-endpoints");
    const doc = await readContext(paths, { room: "user-feature", key: "user-endpoints" });
    expect(doc).toContain("GET /users/:id");

    await sendRoomMessage(paths, { room: "user-feature", from: "backend", content: "API ready" });
    await sendRoomMessage(paths, { room: "user-feature", from: "frontend", content: "Building UI" });
    const msgs = await readRoomMessages(paths, { room: "user-feature" });
    expect(msgs).toHaveLength(2);
  });
});
