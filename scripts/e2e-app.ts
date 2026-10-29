import { spawn } from "node:child_process";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

async function main() {
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  const app = spawn(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        APP_URL: "http://127.0.0.1:3100",
        NEXT_DIST_DIR: ".next-e2e",
        MONGODB_URI: mongo.getUri(),
        MONGODB_DB: "storageviewr-e2e",
        REGISTRATION_ENABLED: "true",
      },
    },
  );

  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    app.kill();
    await mongo.stop();
  }

  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());

  const exitCode = await new Promise<number>((resolve) => {
    app.once("exit", (code) => resolve(code ?? 0));
    app.once("error", () => resolve(1));
  });
  await stop();
  process.exitCode = exitCode;
}

void main();
