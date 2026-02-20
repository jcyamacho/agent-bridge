import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FSContextStore } from "./store/fs-context-store";
import { FSPeerStore } from "./store/fs-peer-store";
import { FSRoomStore } from "./store/fs-room-store";
import {
  getFeatureContext,
  listFeatureContextKeys,
  putFeatureContext,
} from "./tools/context";
import { listPeers, upsertPeer } from "./tools/peers";
import {
  closeFeatureRoom,
  openFeatureRoom,
  postFeatureMessage,
  readFeatureMessages,
} from "./tools/rooms";

let tmpDir: string;
let peerStore: FSPeerStore;
let roomStore: FSRoomStore;
let contextStore: FSContextStore;
const webPeerId = "web";
const backendPeerId = "backend";
const mobilePeerId = "mobile";
const userFeatureRoomId = "feature-user-profile";

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-integration-"));
  peerStore = new FSPeerStore(tmpDir);
  roomStore = new FSRoomStore(tmpDir);
  contextStore = new FSContextStore(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("full workflow: feature room collaboration", () => {
  test("backend, web, and mobile coordinate through one room", async () => {
    await upsertPeer(peerStore, { peerId: webPeerId, name: "Web App" });
    await upsertPeer(peerStore, { peerId: backendPeerId, name: "Backend API" });
    await upsertPeer(peerStore, { peerId: mobilePeerId, name: "Mobile App" });

    const webPeers = await listPeers(peerStore, webPeerId);
    expect(webPeers).toHaveLength(2);

    await openFeatureRoom(roomStore, {
      roomId: userFeatureRoomId,
      createdBy: backendPeerId,
      description: "User profile feature",
    });

    await putFeatureContext(contextStore, roomStore, {
      roomId: userFeatureRoomId,
      key: "api-contract",
      content: "## GET /users/:id\nReturns { id, name, email }",
    });
    await putFeatureContext(contextStore, roomStore, {
      roomId: userFeatureRoomId,
      key: "acceptance-criteria",
      content: "- web + mobile show profile card",
    });

    const keys = await listFeatureContextKeys(contextStore, {
      roomId: userFeatureRoomId,
    });
    expect(keys.sort()).toEqual(["acceptance-criteria", "api-contract"]);

    const apiDoc = await getFeatureContext(contextStore, {
      roomId: userFeatureRoomId,
      key: "api-contract",
    });
    expect(apiDoc).toContain("GET /users/:id");

    await postFeatureMessage(roomStore, {
      roomId: userFeatureRoomId,
      from: backendPeerId,
      type: "update",
      content: "Endpoint merged",
    });
    await postFeatureMessage(roomStore, {
      roomId: userFeatureRoomId,
      from: webPeerId,
      type: "question",
      content: "Do we support avatar urls?",
    });
    await postFeatureMessage(roomStore, {
      roomId: userFeatureRoomId,
      from: mobilePeerId,
      type: "decision",
      content: "Use fallback initials avatar on v1",
    });

    const messages = await readFeatureMessages(roomStore, {
      roomId: userFeatureRoomId,
    });
    expect(messages).toHaveLength(3);
    expect(messages[0]?.type).toBe("update");
    expect(messages[1]?.type).toBe("question");
    expect(messages[2]?.type).toBe("decision");

    await closeFeatureRoom(roomStore, { roomId: userFeatureRoomId });

    expect(
      postFeatureMessage(roomStore, {
        roomId: userFeatureRoomId,
        from: backendPeerId,
        type: "update",
        content: "late update",
      }),
    ).rejects.toThrow("Room feature-user-profile is closed");

    expect(
      putFeatureContext(contextStore, roomStore, {
        roomId: userFeatureRoomId,
        key: "post-close",
        content: "not allowed",
      }),
    ).rejects.toThrow("Room feature-user-profile is closed");
  });

  test("does not create inbox files in room-only workflows", async () => {
    await upsertPeer(peerStore, { peerId: webPeerId });
    await openFeatureRoom(roomStore, {
      roomId: userFeatureRoomId,
      createdBy: webPeerId,
    });
    await postFeatureMessage(roomStore, {
      roomId: userFeatureRoomId,
      from: webPeerId,
      type: "update",
      content: "Kickoff",
    });

    const inboxDir = path.join(tmpDir, "inbox");
    expect(fs.access(inboxDir)).rejects.toThrow();
  });
});
