import { test, expect, describe } from "bun:test";
import { parseArgs } from "./config";

describe("parseArgs", () => {
  test("parses required --peer-id", () => {
    const config = parseArgs(["--peer-id", "frontend"]);
    expect(config.peerId).toBe("frontend");
  });

  test("throws when --peer-id is missing", () => {
    expect(() => parseArgs([])).toThrow("--peer-id is required");
  });

  test("parses optional --name, --project, --bridge-dir", () => {
    const config = parseArgs([
      "--peer-id", "frontend",
      "--name", "Frontend App",
      "--project", "/repos/web",
      "--bridge-dir", "/tmp/bridge",
    ]);
    expect(config.name).toBe("Frontend App");
    expect(config.project).toBe("/repos/web");
    expect(config.bridgeDir).toBe("/tmp/bridge");
  });

  test("defaults name to peerId", () => {
    const config = parseArgs(["--peer-id", "frontend"]);
    expect(config.name).toBe("frontend");
  });

  test("defaults bridgeDir to ~/.agent-bridge", () => {
    const config = parseArgs(["--peer-id", "frontend"]);
    expect(config.bridgeDir).toContain(".agent-bridge");
  });
});
