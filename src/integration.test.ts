import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FSContextStore } from "./store/fs-context-store";
import { FSMessageStore } from "./store/fs-message-store";
import { FSPeerStore } from "./store/fs-peer-store";
import { FSRoomStore } from "./store/fs-room-store";
import { listContext, postContext, readContext } from "./tools/context";
import { checkInbox, reply, sendMessage } from "./tools/messaging";
import { listPeers, registerPeer } from "./tools/peers";
import { createRoom, readRoomMessages, sendRoomMessage } from "./tools/rooms";

let tmpDir: string;
let peerStore: FSPeerStore;
let messageStore: FSMessageStore;
let roomStore: FSRoomStore;
let contextStore: FSContextStore;
const frontendPeerId = "frontend";
const backendPeerId = "backend";
const userFeatureRoomId = "user-feature";

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-integration-"));
  peerStore = new FSPeerStore(tmpDir);
  messageStore = new FSMessageStore(tmpDir);
  roomStore = new FSRoomStore(tmpDir);
  contextStore = new FSContextStore(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("full workflow: question -> answer", () => {
  test("frontend asks backend, backend replies", async () => {
    await registerPeer(peerStore, { peerId: frontendPeerId, name: "Frontend" });
    await registerPeer(peerStore, {
      peerId: backendPeerId,
      name: "Backend API",
    });

    const peers = await listPeers(peerStore, frontendPeerId);
    expect(peers).toHaveLength(1);
    expect(String(peers[0]?.id)).toBe(backendPeerId);

    const question = await sendMessage(messageStore, peerStore, {
      from: frontendPeerId,
      to: backendPeerId,
      content: "What does GET /users/:id return?",
      type: "question",
    });

    const backendInbox = await checkInbox(messageStore, backendPeerId);
    expect(backendInbox).toHaveLength(1);
    expect(backendInbox[0]?.content).toContain("GET /users/:id");

    await reply(messageStore, {
      from: backendPeerId,
      messageId: question.id,
      content: "Returns { id, name, email }",
    });

    const frontendInbox = await checkInbox(messageStore, frontendPeerId);
    expect(frontendInbox).toHaveLength(1);
    expect(frontendInbox[0]?.content).toContain("id, name, email");
    expect(frontendInbox[0]?.replyTo).toBe(question.id);
  });
});

describe("full workflow: shared context via room", () => {
  test("backend shares API schema, frontend reads it", async () => {
    await registerPeer(peerStore, { peerId: frontendPeerId });
    await registerPeer(peerStore, { peerId: backendPeerId });

    await createRoom(roomStore, {
      roomId: userFeatureRoomId,
      createdBy: backendPeerId,
      description: "User feature coordination",
    });
    await postContext(contextStore, {
      roomId: userFeatureRoomId,
      key: "user-endpoints",
      content: "## GET /users/:id\nReturns { id, name, email }",
    });

    const keys = await listContext(contextStore, { roomId: userFeatureRoomId });
    expect(keys).toContain("user-endpoints");
    const doc = await readContext(contextStore, {
      roomId: userFeatureRoomId,
      key: "user-endpoints",
    });
    expect(doc).toContain("GET /users/:id");

    await sendRoomMessage(roomStore, {
      roomId: userFeatureRoomId,
      from: backendPeerId,
      content: "API ready",
    });
    await sendRoomMessage(roomStore, {
      roomId: userFeatureRoomId,
      from: frontendPeerId,
      content: "Building UI",
    });
    const msgs = await readRoomMessages(roomStore, {
      roomId: userFeatureRoomId,
    });
    expect(msgs).toHaveLength(2);
  });
});
