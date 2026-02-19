# agent-bridge

A filesystem-based MCP server that enables peer-to-peer communication
between local AI agents across repositories.

Each local MCP client session runs its own stdio MCP server instance.
All instances read/write to a shared directory (`~/.agent-bridge/`). No
central process - the filesystem is the message bus.

## Setup

```bash
bun install
bun run build
```

## Usage

Register the MCP server in each local agent session with a unique
`--peer-id`.

The examples below use Claude Code CLI, but the same server works with
other local MCP-capable agents (for example, Codex) using their MCP
server registration flow.

```bash
# Frontend session
claude mcp add agent-bridge -- node /path/to/agent-bridge/dist/index.js \
  --peer-id frontend --name "Frontend"

# Backend session
claude mcp add agent-bridge -- node /path/to/agent-bridge/dist/index.js \
  --peer-id backend --name "Backend API"
```

### CLI Arguments

| Argument | Required | Description |
| --- | --- | --- |
| `--peer-id` | Yes | Unique identifier for this peer |
| `--name` | No | Display name (defaults to peer-id) |
| `--project` | No | Project path (defaults to cwd) |
| `--bridge-dir` | No | Shared directory (defaults to `~/.agent-bridge`) |

## Tools

| Tool | Description |
| --- | --- |
| `register` | Update peer registration info |
| `list_peers` | List other registered peers |
| `send_message` | Send a direct message (or broadcast with `to="all"`) |
| `check_inbox` | Check for new messages |
| `reply` | Reply to a message |
| `create_room` | Create a shared room |
| `list_rooms` | List available rooms |
| `send_room_message` | Send a message to a room |
| `read_room_messages` | Read room messages |
| `post_context` | Post a context document to a room |
| `read_context` | Read a context document |
| `list_context` | List context keys in a room |

Room-related tools use `room_id` as the stable room identifier in
their input payloads.

## Development

```bash
bun test          # Run tests
bun run build     # Build for Node.js
```
