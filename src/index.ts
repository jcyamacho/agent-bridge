import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { version } from "../package.json";
import { parseArgs } from "./config";
import { FSContextStore } from "./store/fs-context-store";
import { FSPeerStore } from "./store/fs-peer-store";
import { FSRoomStore } from "./store/fs-room-store";
import {
  getFeatureContext,
  listFeatureContextKeys,
  putFeatureContext,
} from "./tools/context";
import { listPeers, upsertPeer } from "./tools/peers";
import {
  closeFeatureRoom,
  listFeatureRooms,
  openFeatureRoom,
  postFeatureMessage,
  readFeatureMessages,
} from "./tools/rooms";

const config = parseArgs(process.argv.slice(2));
const peerStore = new FSPeerStore(config.bridgeDir);
const roomStore = new FSRoomStore(config.bridgeDir);
const contextStore = new FSContextStore(config.bridgeDir);

const server = new McpServer({
  name: "agent-bridge",
  version,
});

async function heartbeat() {
  await upsertPeer(peerStore, {
    peerId: config.peerId,
    name: config.name,
    project: config.project,
  });
}

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
  "open_feature_room",
  {
    description: "Create a feature room for collaboration",
    inputSchema: z.object({
      room_id: z.string(),
      description: z.string().optional(),
    }),
  },
  async ({ room_id, description }) => {
    await heartbeat();
    const room = await openFeatureRoom(roomStore, {
      roomId: room_id,
      createdBy: config.peerId,
      description,
    });
    return { content: [{ type: "text", text: JSON.stringify(room) }] };
  },
);

server.registerTool(
  "close_feature_room",
  {
    description: "Close a feature room to make it read-only",
    inputSchema: z.object({
      room_id: z.string(),
    }),
  },
  async ({ room_id }) => {
    await heartbeat();
    const room = await closeFeatureRoom(roomStore, {
      roomId: room_id,
    });
    return { content: [{ type: "text", text: JSON.stringify(room) }] };
  },
);

server.registerTool(
  "list_feature_rooms",
  {
    description: "List feature rooms (open by default)",
    inputSchema: z.object({
      include_closed: z.boolean().optional(),
    }),
  },
  async ({ include_closed }) => {
    await heartbeat();
    const rooms = await listFeatureRooms(roomStore, {
      includeClosed: include_closed ?? false,
    });
    return { content: [{ type: "text", text: JSON.stringify(rooms) }] };
  },
);

server.registerTool(
  "post_feature_message",
  {
    description: "Post a typed message to a feature room",
    inputSchema: z.object({
      room_id: z.string(),
      content: z.string(),
      type: z.enum(["update", "question", "decision", "blocker"]),
    }),
  },
  async ({ room_id, content, type }) => {
    await heartbeat();
    const message = await postFeatureMessage(roomStore, {
      roomId: room_id,
      from: config.peerId,
      content,
      type,
    });
    return { content: [{ type: "text", text: JSON.stringify(message) }] };
  },
);

server.registerTool(
  "read_feature_messages",
  {
    description: "Read messages from a feature room",
    inputSchema: z.object({
      room_id: z.string(),
      since: z.string().optional(),
      last_n: z.number().optional(),
    }),
  },
  async ({ room_id, since, last_n }) => {
    await heartbeat();
    const messages = await readFeatureMessages(roomStore, {
      roomId: room_id,
      since,
      lastN: last_n,
    });
    return { content: [{ type: "text", text: JSON.stringify(messages) }] };
  },
);

server.registerTool(
  "put_feature_context",
  {
    description: "Write a context document into a feature room",
    inputSchema: z.object({
      room_id: z.string(),
      key: z.string(),
      content: z.string(),
    }),
  },
  async ({ room_id, key, content }) => {
    await heartbeat();
    await putFeatureContext(contextStore, roomStore, {
      roomId: room_id,
      key,
      content,
    });
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
  "get_feature_context",
  {
    description: "Read a context document from a feature room",
    inputSchema: z.object({
      room_id: z.string(),
      key: z.string(),
    }),
  },
  async ({ room_id, key }) => {
    await heartbeat();
    const content = await getFeatureContext(contextStore, {
      roomId: room_id,
      key,
    });
    return { content: [{ type: "text", text: content }] };
  },
);

server.registerTool(
  "list_feature_context_keys",
  {
    description: "List context keys in a feature room",
    inputSchema: z.object({
      room_id: z.string(),
    }),
  },
  async ({ room_id }) => {
    await heartbeat();
    const keys = await listFeatureContextKeys(contextStore, {
      roomId: room_id,
    });
    return { content: [{ type: "text", text: JSON.stringify(keys) }] };
  },
);

await heartbeat();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`agent-bridge: peer "${config.peerId}" connected`);
