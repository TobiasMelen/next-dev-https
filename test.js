//@ts-check
const { test } = require("node:test");
const { spawn } = require("node:child_process");
const path = require("node:path");

test(
  "Test dev server startup",
  { timeout: 10_000 },
  () =>
    new Promise((res, rej) =>
      setImmediate(() => {
        const childProcess = spawn("pnpm", ["run", "dev"], {
          cwd: "sandbox",
          shell: true,
        });
        childProcess.stdout.setEncoding("utf-8");
        childProcess.stderr.setEncoding("utf-8");
        childProcess.stdout.on("data", (msg) => {
          if (msg.includes("compiled client and server successfully")) {
            childProcess.kill("SIGINT");
            res("Completed");
          }
        });
        childProcess.stderr.on("data", (msg) => {
          rej(Error(msg));
        });
        childProcess.on("error", (err) => {
          rej(err);
        });
      })
    )
);
