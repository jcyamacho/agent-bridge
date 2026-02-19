import fs from "node:fs/promises";
import { atomicWriteJson, readJson } from "../fs/atomic";
import {
  type Message,
  type MessageId,
  MessageIdSchema,
  MessageSchema,
  type PeerId,
} from "../schemas";
import type { MessageStore } from "./contracts";
import { FSLayout } from "./fs-layout";

export class FSMessageStore implements MessageStore {
  private readonly layout: FSLayout;

  constructor(baseDir: string) {
    this.layout = new FSLayout(baseDir);
  }

  async putInbox(peerId: PeerId, message: Message): Promise<void> {
    await atomicWriteJson(
      this.layout.inboxMessageFile(peerId, message.id),
      message,
    );
  }

  async getInbox(
    peerId: PeerId,
    messageId: MessageId,
  ): Promise<Message | undefined> {
    const raw = await readJson<unknown>(
      this.layout.inboxMessageFile(peerId, messageId),
    );
    const parsed = MessageSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  }

  async listInbox(peerId: PeerId): Promise<Message[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.layout.inboxDir(peerId));
    } catch {
      return [];
    }

    const messages: Message[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const parsedId = MessageIdSchema.safeParse(file.replace(/\.json$/, ""));
      if (!parsedId.success) continue;
      const message = await this.getInbox(peerId, parsedId.data);
      if (message) messages.push(message);
    }

    return messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async updateInbox(
    peerId: PeerId,
    messageId: MessageId,
    patch: Partial<Message>,
  ): Promise<Message | undefined> {
    const existing = await this.getInbox(peerId, messageId);
    if (!existing) return undefined;

    const next: Message = { ...existing, ...patch };
    await atomicWriteJson(
      this.layout.inboxMessageFile(peerId, messageId),
      next,
    );
    return next;
  }

  async archiveInbox(peerId: PeerId, messageId: MessageId): Promise<void> {
    await fs.mkdir(this.layout.archiveDir(peerId), { recursive: true });
    await fs.rename(
      this.layout.inboxMessageFile(peerId, messageId),
      this.layout.archiveMessageFile(peerId, messageId),
    );
  }
}
