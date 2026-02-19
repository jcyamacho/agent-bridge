import { describe, expect, test } from "bun:test";
import {
  MessageSchema,
  PeerSchema,
  RoomMessageSchema,
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

describe("MessageSchema", () => {
  test("validates a question message", () => {
    const result = MessageSchema.safeParse({
      id: "msg_1708300000000_a1b2c3",
      from: "frontend",
      to: "backend",
      type: "question",
      content: "What does GET /users/:id return?",
      createdAt: "2026-02-19T10:31:00.000Z",
      status: "unread",
    });
    expect(result.success).toBe(true);
  });

  test("validates a reply message with replyTo", () => {
    const result = MessageSchema.safeParse({
      id: "msg_1708300001000_x1y2z3",
      from: "backend",
      to: "frontend",
      type: "reply",
      content: "Returns { id, name, email }",
      replyTo: "msg_1708300000000_a1b2c3",
      createdAt: "2026-02-19T10:32:00.000Z",
      status: "unread",
    });
    expect(result.success).toBe(true);
  });
});

describe("RoomMetaSchema", () => {
  test("validates room metadata", () => {
    const result = RoomMetaSchema.safeParse({
      id: "feature-x",
      createdBy: "frontend",
      createdAt: "2026-02-19T10:30:00.000Z",
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
      createdAt: "2026-02-19T10:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
