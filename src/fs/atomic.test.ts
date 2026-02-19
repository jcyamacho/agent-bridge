import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { atomicWriteJson, readJson } from "./atomic";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true });
});

describe("atomicWriteJson", () => {
  test("writes JSON file atomically", async () => {
    const filePath = path.join(tmpDir, "test.json");
    await atomicWriteJson(filePath, { hello: "world" });
    const content = JSON.parse(await fs.readFile(filePath, "utf-8"));
    expect(content).toEqual({ hello: "world" });
  });

  test("overwrites existing file", async () => {
    const filePath = path.join(tmpDir, "test.json");
    await atomicWriteJson(filePath, { v: 1 });
    await atomicWriteJson(filePath, { v: 2 });
    const content = JSON.parse(await fs.readFile(filePath, "utf-8"));
    expect(content).toEqual({ v: 2 });
  });
});

describe("readJson", () => {
  test("reads and parses JSON file", async () => {
    const filePath = path.join(tmpDir, "test.json");
    await fs.writeFile(filePath, JSON.stringify({ key: "val" }));
    const result = await readJson(filePath);
    expect(result).toEqual({ key: "val" });
  });

  test("returns undefined for missing file", async () => {
    const result = await readJson(path.join(tmpDir, "nope.json"));
    expect(result).toBeUndefined();
  });
});
