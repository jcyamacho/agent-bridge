import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { postContext, readContext, listContext } from "./context";
import { createRoom } from "./rooms";
import { BridgePaths } from "../fs/paths";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let tmpDir: string;
let paths: BridgePaths;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
  paths = new BridgePaths(tmpDir);
  await createRoom(paths, { name: "feature", createdBy: "frontend" });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("postContext + readContext", () => {
  test("writes and reads context markdown", async () => {
    await postContext(paths, { room: "feature", key: "user-schema", content: "# User\n- id: string" });
    const content = await readContext(paths, { room: "feature", key: "user-schema" });
    expect(content).toBe("# User\n- id: string");
  });

  test("overwrites existing context", async () => {
    await postContext(paths, { room: "feature", key: "api", content: "v1" });
    await postContext(paths, { room: "feature", key: "api", content: "v2" });
    expect(await readContext(paths, { room: "feature", key: "api" })).toBe("v2");
  });
});

describe("listContext", () => {
  test("lists all context keys", async () => {
    await postContext(paths, { room: "feature", key: "schema", content: "..." });
    await postContext(paths, { room: "feature", key: "auth", content: "..." });
    const keys = await listContext(paths, { room: "feature" });
    expect(keys.sort()).toEqual(["auth", "schema"]);
  });

  test("returns empty when no context", async () => {
    expect(await listContext(paths, { room: "feature" })).toEqual([]);
  });
});
