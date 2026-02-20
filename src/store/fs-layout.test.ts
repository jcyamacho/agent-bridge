import { describe, expect, test } from "bun:test";
import path from "node:path";
import { ContextKeySchema, PeerIdSchema, RoomIdSchema } from "../schemas";
import { FSLayout } from "./fs-layout";

const peerId = (value: string) => PeerIdSchema.parse(value);
const roomId = (value: string) => RoomIdSchema.parse(value);
const contextKey = (value: string) => ContextKeySchema.parse(value);

describe("FSLayout", () => {
  test("builds expected paths", () => {
    const baseDir = path.join("tmp", "agent-bridge");
    const layout = new FSLayout(baseDir);

    expect(layout.peerFile(peerId("frontend"))).toBe(
      path.join(baseDir, "peers", "frontend.json"),
    );
    expect(
      layout.roomContextFile(roomId("feature-room"), contextKey("api-spec")),
    ).toBe(
      path.join(baseDir, "rooms", "feature-room", "context", "api-spec.md"),
    );
  });
});
