import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { parseArgs } from "./config";
import { BridgePaths } from "./fs/paths";
import { registerPeer, listPeers } from "./tools/peers";
import { sendMessage, checkInbox, reply } from "./tools/messaging";
import { createRoom, listRooms, sendRoomMessage, readRoomMessages } from "./tools/rooms";
import { postContext, readContext, listContext } from "./tools/context";

const config = parseArgs(process.argv.slice(2));
const paths = new BridgePaths(config.bridgeDir);

const server = new McpServer({
  name: "agent-bridge",
  version: "0.1.0",
});

async function heartbeat() {
  await registerPeer(paths, {
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
    const peer = await registerPeer(paths, {
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
    const peers = await listPeers(paths, config.peerId);
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
      type: z.enum(["question", "reply", "announcement", "context_share"]).optional(),
    }),
  },
  async ({ to, content, type }) => {
    await heartbeat();
    const msg = await sendMessage(paths, {
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
    let messages = await checkInbox(paths, config.peerId);
    if (!include_read) {
      messages = messages.filter((m) => m.status === "unread" || m.status === "read");
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
    const msg = await reply(paths, {
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
    description: "Create a shared room for group discussion and context sharing",
    inputSchema: z.object({
      name: z.string(),
      description: z.string().optional(),
    }),
  },
  async ({ name, description }) => {
    await heartbeat();
    const room = await createRoom(paths, {
      name,
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
    const rooms = await listRooms(paths);
    return { content: [{ type: "text", text: JSON.stringify(rooms) }] };
  },
);

server.registerTool(
  "send_room_message",
  {
    description: "Send a message to a room",
    inputSchema: z.object({
      room: z.string(),
      content: z.string(),
    }),
  },
  async ({ room, content }) => {
    await heartbeat();
    const msg = await sendRoomMessage(paths, {
      room,
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
      room: z.string(),
      since: z.string().optional(),
      last_n: z.number().optional(),
    }),
  },
  async ({ room, since, last_n }) => {
    await heartbeat();
    const messages = await readRoomMessages(paths, {
      room,
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
      room: z.string(),
      key: z.string(),
      content: z.string(),
    }),
  },
  async ({ room, key, content }) => {
    await heartbeat();
    await postContext(paths, { room, key, content });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, room, key }) }] };
  },
);

server.registerTool(
  "read_context",
  {
    description: "Read a context document from a room's shared board",
    inputSchema: z.object({
      room: z.string(),
      key: z.string(),
    }),
  },
  async ({ room, key }) => {
    await heartbeat();
    const content = await readContext(paths, { room, key });
    return { content: [{ type: "text", text: content }] };
  },
);

server.registerTool(
  "list_context",
  {
    description: "List all context keys in a room",
    inputSchema: z.object({
      room: z.string(),
    }),
  },
  async ({ room }) => {
    await heartbeat();
    const keys = await listContext(paths, { room });
    return { content: [{ type: "text", text: JSON.stringify(keys) }] };
  },
);

await heartbeat();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`agent-bridge: peer "${config.peerId}" connected`);
