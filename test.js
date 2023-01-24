//@ts-check
const { test } = require("node:test");
const { spawn } = require("node:child_process");

test(
  "Test dev server startup",
  { timeout: 10_000 },
  async () =>
    await new Promise((res, rej) => {
      console.log("Spawining process");
      const childProcess = spawn("pnpm", ["run", "dev"], {
        cwd: "sandbox",
        shell: true,
        stdio: "pipe",
      });
      childProcess.stdout.setEncoding("utf-8");
      childProcess.stderr.setEncoding("utf-8");
      childProcess.stdout.on("data", (msg) => {
        console.log("Received message", msg);
        if (msg.includes("compiled client and server successfully")) {
          res("Completed");
          childProcess.kill("SIGINT");
        }
      });
      childProcess.stderr.on("data", (msg) => {
        rej(Error(msg));
      });
      childProcess.on("error", (err) => {
        rej(err);
      });
      childProcess.on("close", (exitCode) => {
        rej(`Exit code ${exitCode}`);
      });
    })
);
