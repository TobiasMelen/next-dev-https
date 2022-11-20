//@ts-check
const { test } = require("node:test");
const { spawn } = require("node:child_process");
const path = require("node:path");

test("Test dev server startup", () =>
  new Promise((res, rej) => {
    const childProcess = spawn("pnpm", ["run", "dev"], {
      cwd: path.join(__dirname, "sandbox"),
      stdio: ["pipe"],
    });
    const timeout = setTimeout(() => {
      rej("Test timed out");
      childProcess.kill("SIGINT");
    }, 10_000);
    childProcess.stdout.setEncoding("utf-8");
    childProcess.stderr.setEncoding("utf-8");
    childProcess.stdout.on("data", (msg) => {
      if (msg.includes("compiled client and server successfully")) {
        childProcess.kill("SIGINT");
        clearTimeout(timeout);
        res("Completed");
      }
    });
    childProcess.stderr.on("data", (msg) => rej(msg));
    childProcess.on("error", (err) => rej(err));
  }));
