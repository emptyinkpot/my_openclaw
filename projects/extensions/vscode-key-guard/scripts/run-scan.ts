import { writeFile } from "node:fs/promises";
import { runPeriodicScan } from "../backend/jobs/periodic-scan.ts";
import { resolveRuntimeStateFile } from "../backend/services/runtime-state-paths.ts";

async function main() {
  const result = await runPeriodicScan();
  const output = JSON.stringify(result, null, 2);
  const lastRunPath = await resolveRuntimeStateFile("last-run.json");

  await writeFile(lastRunPath, `${output}\n`, "utf8");
  process.stdout.write(`${output}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
