#!/usr/bin/env node
/**
 * @deprecated Используйте единый дэшборд:
 *   node project-docs/build-dashboard.mjs
 * Результат: project-docs/dashboard.html
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const result = spawnSync("node", ["build-dashboard.mjs"], {
  cwd: join(__dir, ".."),
  stdio: "inherit",
});

if (result.status !== 0) process.exit(result.status ?? 1);
console.log("\npricing-dashboard.html больше не генерируется.");
console.log("Откройте: project-docs/dashboard.html");
