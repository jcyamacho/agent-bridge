# AGENTS.md

Use Bun for local development workflows, but keep application code
compatible with both Bun and Node.js.

- Prefer `bun install` and `bun run <script>` for day-to-day development.
- Commands should also work in Node-based environments (`npm`, `pnpm`,
  or `yarn`) when needed.
- Avoid Bun-only behavior in runtime code paths.
- Use `bun run build` to package a Node.js-compatible output script at
  `dist/index.js`.

## APIs

- Do not use Bun-specific APIs in application code (for example:
  `Bun.serve`, `Bun.file`, `Bun.sql`, `Bun.redis`, `bun:sqlite`,
  `Bun.$`, or `bun:test`).
- Prefer portable Node-compatible libraries and standards-based APIs.
- Use `node:fs`/`node:fs/promises` for filesystem access.
- Use framework/runtime-agnostic HTTP servers and tooling.

## Testing

Use Bun for testing in this project.

- Run tests with `bun test`.
- Use `bun:test` APIs in test files.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```
