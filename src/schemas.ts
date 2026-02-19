import { z } from "zod";

export const PeerIdSchema = z.string().min(1).brand<"PeerId">();
export type PeerId = z.infer<typeof PeerIdSchema>;

export const MessageIdSchema = z.string().min(1).brand<"MessageId">();
export type MessageId = z.infer<typeof MessageIdSchema>;

export const RoomIdSchema = z.string().min(1).brand<"RoomId">();
export type RoomId = z.infer<typeof RoomIdSchema>;

export const ContextKeySchema = z.string().min(1).brand<"ContextKey">();
export type ContextKey = z.infer<typeof ContextKeySchema>;

export const PeerSchema = z.object({
  id: PeerIdSchema,
  name: z.string().optional(),
  project: z.string().optional(),
  description: z.string().optional(),
  registeredAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
});
export type Peer = z.infer<typeof PeerSchema>;

export const messageTypes = [
  "question",
  "reply",
  "announcement",
  "context_share",
] as const;
export const messageStatuses = ["unread", "read", "archived"] as const;

export const MessageSchema = z.object({
  id: MessageIdSchema,
  from: PeerIdSchema,
  to: z.union([PeerIdSchema, z.literal("all")]),
  type: z.enum(messageTypes),
  content: z.string(),
  replyTo: MessageIdSchema.optional(),
  createdAt: z.iso.datetime(),
  status: z.enum(messageStatuses),
});
export type Message = z.infer<typeof MessageSchema>;

export const RoomMetaSchema = z.object({
  id: RoomIdSchema,
  description: z.string().optional(),
  createdBy: PeerIdSchema,
  createdAt: z.iso.datetime(),
});
export type RoomMeta = z.infer<typeof RoomMetaSchema>;

export const RoomMessageSchema = z.object({
  id: MessageIdSchema,
  from: PeerIdSchema,
  content: z.string(),
  createdAt: z.iso.datetime(),
});
export type RoomMessage = z.infer<typeof RoomMessageSchema>;
