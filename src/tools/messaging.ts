import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { BridgePaths } from "../fs/paths";
import type { Message } from "../schemas";
import { atomicWriteJson, readJson } from "../fs/atomic";

function generateMessageId(): string {
  return `msg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

interface SendOpts {
  from: string;
  to: string;
  content: string;
  type?: Message["type"];
  replyTo?: string;
}

export async function sendMessage(paths: BridgePaths, opts: SendOpts): Promise<Message> {
  const msg: Message = {
    id: generateMessageId(),
    from: opts.from,
    to: opts.to,
    type: opts.type ?? "question",
    content: opts.content,
    replyTo: opts.replyTo,
    createdAt: new Date().toISOString(),
    status: "unread",
  };

  if (opts.to === "all") {
    let files: string[];
    try {
      files = await fs.readdir(paths.peersDir);
    } catch {
      files = [];
    }
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const peerId = file.replace(/\.json$/, "");
      if (peerId === opts.from) continue;
      const copy = { ...msg, to: peerId };
      await atomicWriteJson(path.join(paths.inboxDir(peerId), `${msg.id}.json`), copy);
    }
  } else {
    await atomicWriteJson(path.join(paths.inboxDir(opts.to), `${msg.id}.json`), msg);
  }

  return msg;
}

export async function checkInbox(paths: BridgePaths, peerId: string): Promise<Message[]> {
  let files: string[];
  try {
    files = await fs.readdir(paths.inboxDir(peerId));
  } catch {
    return [];
  }

  const messages: Message[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(paths.inboxDir(peerId), file);
    const msg = await readJson<Message>(filePath);
    if (!msg) continue;

    if (msg.status === "unread") {
      msg.status = "read";
      await atomicWriteJson(filePath, msg);
    }
    messages.push(msg);
  }

  return messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

interface ReplyOpts {
  from: string;
  messageId: string;
  content: string;
}

export async function reply(paths: BridgePaths, opts: ReplyOpts): Promise<Message> {
  const inboxDir = paths.inboxDir(opts.from);
  const originalPath = path.join(inboxDir, `${opts.messageId}.json`);
  const original = await readJson<Message>(originalPath);
  if (!original) throw new Error(`Message ${opts.messageId} not found`);

  const replyMsg = await sendMessage(paths, {
    from: opts.from,
    to: original.from,
    content: opts.content,
    type: "reply",
    replyTo: opts.messageId,
  });

  const archiveDir = paths.archiveDir(opts.from);
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.rename(originalPath, path.join(archiveDir, `${opts.messageId}.json`));

  return replyMsg;
}
