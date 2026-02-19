import crypto from "node:crypto";
import {
  type Message,
  type MessageId,
  MessageIdSchema,
  PeerIdSchema,
} from "../schemas";
import type { MessageStore, PeerStore } from "../store/contracts";

function generateMessageId(prefix = "msg"): MessageId {
  return MessageIdSchema.parse(
    `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
  );
}

interface SendOpts {
  from: string;
  to: string;
  content: string;
  type?: Message["type"];
  replyTo?: string;
}

export async function sendMessage(
  messageStore: MessageStore,
  peerStore: Pick<PeerStore, "listIds">,
  opts: SendOpts,
): Promise<Message> {
  const from = PeerIdSchema.parse(opts.from);
  const msg: Message = {
    id: generateMessageId(),
    from,
    to: opts.to === "all" ? "all" : PeerIdSchema.parse(opts.to),
    type: opts.type ?? "question",
    content: opts.content,
    replyTo: opts.replyTo ? MessageIdSchema.parse(opts.replyTo) : undefined,
    createdAt: new Date().toISOString(),
    status: "unread",
  };

  if (opts.to === "all") {
    const peerIds = await peerStore.listIds();
    for (const peerId of peerIds) {
      if (peerId === from) continue;
      const copy: Message = { ...msg, to: peerId };
      await messageStore.putInbox(peerId, copy);
    }
  } else {
    await messageStore.putInbox(PeerIdSchema.parse(opts.to), msg);
  }

  return msg;
}

export async function checkInbox(
  messageStore: MessageStore,
  peerId: string,
): Promise<Message[]> {
  const parsedPeerId = PeerIdSchema.parse(peerId);
  const messages = await messageStore.listInbox(parsedPeerId);

  const updated: Message[] = [];
  for (const msg of messages) {
    if (msg.status !== "unread") {
      updated.push(msg);
      continue;
    }

    const next = await messageStore.updateInbox(parsedPeerId, msg.id, {
      status: "read",
    });
    updated.push(next ?? { ...msg, status: "read" });
  }

  return updated;
}

interface ReplyOpts {
  from: string;
  messageId: string;
  content: string;
}

export async function reply(
  messageStore: MessageStore,
  opts: ReplyOpts,
): Promise<Message> {
  const from = PeerIdSchema.parse(opts.from);
  const messageId = MessageIdSchema.parse(opts.messageId);
  const original = await messageStore.getInbox(from, messageId);
  if (!original) throw new Error(`Message ${opts.messageId} not found`);

  const replyMsg: Message = {
    id: generateMessageId(),
    from,
    to: original.from,
    content: opts.content,
    type: "reply",
    replyTo: messageId,
    createdAt: new Date().toISOString(),
    status: "unread",
  };

  await messageStore.putInbox(original.from, replyMsg);
  await messageStore.archiveInbox(from, messageId);
  return replyMsg;
}
