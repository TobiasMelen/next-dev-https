//@ts-check
const { test } = require("node:test");
const { spawn } = require("node:child_process");

test("Test dev server startup", () => {
  const childProcess = spawn("pnpm", ["run", "dev"], {
    cwd: "sandbox",
    shell: true,
    stdio: "pipe",
    detached: true,
  });
  return new Promise((res, rej) => {
    childProcess.stdout.setEncoding("utf-8");
    childProcess.stderr.setEncoding("utf-8");
    childProcess.stdout.on("data", (msg) => {
      if (msg.includes("compiled client and server successfully")) {
        res("Completed");
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
  }).finally(() => {
    process.kill(
      //@ts-ignore
      -childProcess.pid
    );
  });
});
