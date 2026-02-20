import { describe, expect, test } from "bun:test";
import {
  PeerSchema,
  RoomMessageSchema,
  RoomMessageTypeSchema,
  RoomMetaSchema,
} from "./schemas";

describe("PeerSchema", () => {
  test("validates a valid peer", () => {
    const result = PeerSchema.safeParse({
      id: "frontend",
      name: "Frontend App",
      project: "~/repos/web",
      description: "Next.js app",
      registeredAt: "2026-02-19T10:30:00.000Z",
      lastSeenAt: "2026-02-19T11:45:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  test("allows optional fields", () => {
    const result = PeerSchema.safeParse({
      id: "frontend",
      registeredAt: "2026-02-19T10:30:00.000Z",
      lastSeenAt: "2026-02-19T11:45:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("RoomMessageTypeSchema", () => {
  test("validates allowed feature message types", () => {
    for (const type of ["update", "question", "decision", "blocker"]) {
      expect(RoomMessageTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  test("rejects unknown message type", () => {
    expect(RoomMessageTypeSchema.safeParse("announcement").success).toBe(false);
  });
});

describe("RoomMetaSchema", () => {
  test("validates room metadata", () => {
    const result = RoomMetaSchema.safeParse({
      id: "feature-x",
      createdBy: "frontend",
      createdAt: "2026-02-19T10:30:00.000Z",
      status: "open",
    });
    expect(result.success).toBe(true);
  });
});

describe("RoomMessageSchema", () => {
  test("validates a room message", () => {
    const result = RoomMessageSchema.safeParse({
      id: "rm_123",
      from: "frontend",
      content: "Hello room",
      type: "update",
      createdAt: "2026-02-19T10:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
