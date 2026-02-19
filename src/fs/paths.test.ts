import { test, expect, describe } from "bun:test";
import { BridgePaths } from "./paths";

describe("BridgePaths", () => {
  const bp = new BridgePaths("/tmp/bridge");

  test("peerFile returns correct path", () => {
    expect(bp.peerFile("frontend")).toBe("/tmp/bridge/peers/frontend.json");
  });

  test("peersDir returns correct path", () => {
    expect(bp.peersDir).toBe("/tmp/bridge/peers");
  });

  test("inboxDir returns correct path", () => {
    expect(bp.inboxDir("frontend")).toBe("/tmp/bridge/inbox/frontend");
  });

  test("archiveDir returns correct path", () => {
    expect(bp.archiveDir("frontend")).toBe("/tmp/bridge/inbox/frontend/archive");
  });

  test("roomDir returns correct path", () => {
    expect(bp.roomDir("my-room")).toBe("/tmp/bridge/rooms/my-room");
  });

  test("roomMetaFile returns correct path", () => {
    expect(bp.roomMetaFile("my-room")).toBe("/tmp/bridge/rooms/my-room/meta.json");
  });

  test("roomMessagesFile returns correct path", () => {
    expect(bp.roomMessagesFile("my-room")).toBe("/tmp/bridge/rooms/my-room/messages.jsonl");
  });

  test("roomContextDir returns correct path", () => {
    expect(bp.roomContextDir("my-room")).toBe("/tmp/bridge/rooms/my-room/context");
  });

  test("roomContextFile returns correct path", () => {
    expect(bp.roomContextFile("my-room", "schema")).toBe("/tmp/bridge/rooms/my-room/context/schema.md");
  });
});
