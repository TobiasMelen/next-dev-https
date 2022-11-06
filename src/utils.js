const path = require("path");
const fs = require("fs");

/** @param {string} dir */
function getProjectDir(dir) {
  try {
    const resolvedDir = path.resolve(dir || ".");
    const realDir = fs.realpathSync.native(resolvedDir);
    if (
      resolvedDir !== realDir &&
      resolvedDir.toLowerCase() === realDir.toLowerCase()
    ) {
      console.warn(
        `Invalid casing detected for project dir, received ${resolvedDir} actual path ${realDir}, see more info here https://nextjs.org/docs/messages/invalid-project-dir-casing`
      );
    }
    return realDir;
  } catch (err) {
    if (isError(err) && err.code === "ENOENT") {
      console.error(
        `Invalid project directory provided, no such directory: ${path.resolve(
          dir || "."
        )}`
      );
      process.exit(1);
    }
    throw err;
  }
}

/**  @param {string} message */
function printAndExit(message, code = 1) {
  if (code === 0) {
    console.log(message);
  } else {
    console.error(message);
  }
  process.exit(code);
}

/**
 * @param {unknown} err
 * @returns {err is Error & {code?: string}}
 */
function isError(err) {
  return (
    typeof err === "object" && err !== null && "name" in err && "message" in err
  );
}

/** @param {Record<string, unknown>} args */
function getPort(args) {
  if (typeof args["--port"] === "number") {
    return args["--port"];
  }
  const parsed = process.env.PORT && parseInt(process.env.PORT, 10);
  if (typeof parsed === "number" && !Number.isNaN(parsed)) {
    return parsed;
  }
  return 3000;
}

function getLocalIpV4Address() {
  //thanks @ https://stackoverflow.com/a/8440736
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  /** @type { Record<string, string[]> } */
  const results = {};
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
      const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
      if (net.family === familyV4Value && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  //Should sort these after speed, but then map for all operation systems is needed.
  return Object.values(results).flatMap((ips) => ips);
}

const CONFIG_FILES = ["next.config.js", "next.config.mjs"];

module.exports = {
  getProjectDir,
  printAndExit,
  isError,
  getPort,
  CONFIG_FILES,
  getLocalIpV4Address,
};
