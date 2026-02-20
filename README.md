# agent-bridge

A filesystem-based MCP server that enables room-first collaboration
between local AI agents across repositories.

Each local MCP client session runs its own stdio MCP server instance.
All instances read/write to a shared directory (`~/.agent-bridge/`). No
central process - the filesystem is the message bus.

## Development Setup

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
claude mcp add agent-bridge -- npx -y @jcyamacho/agent-bridge \
  --peer-id frontend --name "Frontend"

# Backend session
claude mcp add agent-bridge -- npx -y @jcyamacho/agent-bridge \
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
| `list_peers` | List other registered peers |
| `open_feature_room` | Create a feature room |
| `close_feature_room` | Close a feature room (read-only) |
| `list_feature_rooms` | List open feature rooms (or include closed) |
| `post_feature_message` | Post a typed feature message (`update`, `question`, `decision`, `blocker`) |
| `read_feature_messages` | Read feature room messages |
| `put_feature_context` | Write a context document in a feature room |
| `get_feature_context` | Read a context document from a feature room |
| `list_feature_context_keys` | List context keys in a feature room |

Feature-room tools use `room_id` as the stable room identifier in their
input payloads. Closed rooms are read-only.

Peer registration is automatic on startup and heartbeat; there is no
manual peer-upsert tool.

## Development

```bash
bun test          # Run tests
bun run build     # Build for Node.js
```
