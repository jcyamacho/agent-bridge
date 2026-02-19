import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { parseArgs } from "./config";
import { FSContextStore } from "./store/fs-context-store";
import { FSMessageStore } from "./store/fs-message-store";
import { FSPeerStore } from "./store/fs-peer-store";
import { FSRoomStore } from "./store/fs-room-store";
import { listContext, postContext, readContext } from "./tools/context";
import { checkInbox, reply, sendMessage } from "./tools/messaging";
import { listPeers, registerPeer } from "./tools/peers";
import {
  createRoom,
  listRooms,
  readRoomMessages,
  sendRoomMessage,
} from "./tools/rooms";

const config = parseArgs(process.argv.slice(2));
const peerStore = new FSPeerStore(config.bridgeDir);
const messageStore = new FSMessageStore(config.bridgeDir);
const roomStore = new FSRoomStore(config.bridgeDir);
const contextStore = new FSContextStore(config.bridgeDir);

const server = new McpServer({
  name: "agent-bridge",
  version: "0.1.0",
});

async function heartbeat() {
  await registerPeer(peerStore, {
    peerId: config.peerId,
    name: config.name,
    project: config.project,
  });
}

server.registerTool(
  "register",
  {
    description: "Update this peer's registration info (name, description)",
    inputSchema: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
    }),
  },
  async ({ name, description }) => {
    const peer = await registerPeer(peerStore, {
      peerId: config.peerId,
      name: name ?? config.name,
      description,
    });
    return { content: [{ type: "text", text: JSON.stringify(peer) }] };
  },
);

server.registerTool(
  "list_peers",
  {
    description: "List all other registered peers",
    inputSchema: z.object({}),
  },
  async () => {
    await heartbeat();
    const peers = await listPeers(peerStore, config.peerId);
    return { content: [{ type: "text", text: JSON.stringify(peers) }] };
  },
);

server.registerTool(
  "send_message",
  {
    description: 'Send a direct message to a peer (use to="all" for broadcast)',
    inputSchema: z.object({
      to: z.string(),
      content: z.string(),
      type: z
        .enum(["question", "reply", "announcement", "context_share"])
        .optional(),
    }),
  },
  async ({ to, content, type }) => {
    await heartbeat();
    const msg = await sendMessage(messageStore, peerStore, {
      from: config.peerId,
      to,
      content,
      type: type ?? "question",
    });
    return { content: [{ type: "text", text: JSON.stringify(msg) }] };
  },
);

server.registerTool(
  "check_inbox",
  {
    description: "Check inbox for new messages",
    inputSchema: z.object({
      include_read: z.boolean().optional(),
    }),
  },
  async ({ include_read }) => {
    await heartbeat();
    let messages = await checkInbox(messageStore, config.peerId);
    if (!include_read) {
      messages = messages.filter(
        (m) => m.status === "unread" || m.status === "read",
      );
    }
    return { content: [{ type: "text", text: JSON.stringify(messages) }] };
  },
);

server.registerTool(
  "reply",
  {
    description: "Reply to a message in your inbox",
    inputSchema: z.object({
      message_id: z.string(),
      content: z.string(),
    }),
  },
  async ({ message_id, content }) => {
    await heartbeat();
    const msg = await reply(messageStore, {
      from: config.peerId,
      messageId: message_id,
      content,
    });
    return { content: [{ type: "text", text: JSON.stringify(msg) }] };
  },
);

server.registerTool(
  "create_room",
  {
    description:
      "Create a shared room for group discussion and context sharing",
    inputSchema: z.object({
      room_id: z.string(),
      description: z.string().optional(),
    }),
  },
  async ({ room_id, description }) => {
    await heartbeat();
    const room = await createRoom(roomStore, {
      roomId: room_id,
      createdBy: config.peerId,
      description,
    });
    return { content: [{ type: "text", text: JSON.stringify(room) }] };
  },
);

server.registerTool(
  "list_rooms",
  {
    description: "List all available rooms",
    inputSchema: z.object({}),
  },
  async () => {
    await heartbeat();
    const rooms = await listRooms(roomStore);
    return { content: [{ type: "text", text: JSON.stringify(rooms) }] };
  },
);

server.registerTool(
  "send_room_message",
  {
    description: "Send a message to a room",
    inputSchema: z.object({
      room_id: z.string(),
      content: z.string(),
    }),
  },
  async ({ room_id, content }) => {
    await heartbeat();
    const msg = await sendRoomMessage(roomStore, {
      roomId: room_id,
      from: config.peerId,
      content,
    });
    return { content: [{ type: "text", text: JSON.stringify(msg) }] };
  },
);

server.registerTool(
  "read_room_messages",
  {
    description: "Read messages from a room",
    inputSchema: z.object({
      room_id: z.string(),
      since: z.string().optional(),
      last_n: z.number().optional(),
    }),
  },
  async ({ room_id, since, last_n }) => {
    await heartbeat();
    const messages = await readRoomMessages(roomStore, {
      roomId: room_id,
      since,
      lastN: last_n,
    });
    return { content: [{ type: "text", text: JSON.stringify(messages) }] };
  },
);

server.registerTool(
  "post_context",
  {
    description: "Post a context document to a room's shared board",
    inputSchema: z.object({
      room_id: z.string(),
      key: z.string(),
      content: z.string(),
    }),
  },
  async ({ room_id, key, content }) => {
    await heartbeat();
    await postContext(contextStore, { roomId: room_id, key, content });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true, roomId: room_id, key }),
        },
      ],
    };
  },
);

server.registerTool(
  "read_context",
  {
    description: "Read a context document from a room's shared board",
    inputSchema: z.object({
      room_id: z.string(),
      key: z.string(),
    }),
  },
  async ({ room_id, key }) => {
    await heartbeat();
    const content = await readContext(contextStore, { roomId: room_id, key });
    return { content: [{ type: "text", text: content }] };
  },
);

server.registerTool(
  "list_context",
  {
    description: "List all context keys in a room",
    inputSchema: z.object({
      room_id: z.string(),
    }),
  },
  async ({ room_id }) => {
    await heartbeat();
    const keys = await listContext(contextStore, { roomId: room_id });
    return { content: [{ type: "text", text: JSON.stringify(keys) }] };
  },
);

await heartbeat();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`agent-bridge: peer "${config.peerId}" connected`);
