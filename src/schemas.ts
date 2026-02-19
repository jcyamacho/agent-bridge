import { z } from "zod";

export const PeerSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  project: z.string().optional(),
  description: z.string().optional(),
  registeredAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
});
export type Peer = z.infer<typeof PeerSchema>;

export const messageTypes = ["question", "reply", "announcement", "context_share"] as const;
export const messageStatuses = ["unread", "read", "archived"] as const;

export const MessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.enum(messageTypes),
  content: z.string(),
  replyTo: z.string().optional(),
  createdAt: z.string().datetime(),
  status: z.enum(messageStatuses),
});
export type Message = z.infer<typeof MessageSchema>;

export const RoomMetaSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});
export type RoomMeta = z.infer<typeof RoomMetaSchema>;

export const RoomMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type RoomMessage = z.infer<typeof RoomMessageSchema>;
