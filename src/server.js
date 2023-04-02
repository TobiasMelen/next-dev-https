#!/usr/bin/env node
//@ts-check
"use strict";
const arg = require("arg");
var fs = require("fs");
var path = require("path");
var http = require("http");
const https = require("https");
var next = require("next");
var qrcode = require("qrcode-terminal");

const {
  printAndExit,
  getProjectDir,
  getPort,
  isError,
  CONFIG_FILES,
  getLocalIpV4Address,
} = require("./utils");
const { X509Certificate } = require("crypto");
const selfSigned = require("selfsigned");

const generateCert = (/** @type {string} */ dir) => {
  const certDir = path.join(dir, "node_modules", ".next-dev-mobile");
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  const certPath = path.join(certDir, "cert.pem");
  const keyPath = path.join(certDir, "key.pem");
  const existingCert =
    fs.existsSync(certPath) && fs.readFileSync(certPath, { encoding: "utf-8" });
  const existingKey =
    fs.existsSync(keyPath) && fs.readFileSync(keyPath, { encoding: "utf-8" });
  if (
    existingCert &&
    existingKey &&
    new Date(new X509Certificate(existingCert).validTo) > new Date()
  ) {
    return { cert: existingCert, key: existingKey };
  }
  console.log("Generating Fresh self signed https certificate.");
  const selfSignedCert = selfSigned.generate();
  fs.writeFileSync(certPath, selfSignedCert.cert);
  fs.writeFileSync(keyPath, selfSignedCert.private);
  return { cert: selfSignedCert.cert, key: selfSignedCert.private };
};

/**
 *
 * @param {string[] | undefined} argv
 * @returns
 */
const nextDev = (argv) => {
  const validArgs = {
    // Types
    "--help": Boolean,
    "--port": Number,
    "--hostname": String,
    "--turbo": Boolean,
    // To align current messages with native binary.
    // Will need to adjust subcommand later.
    "--show-all": Boolean,
    "--root": String,
    "--qr": Boolean,
    "--https": Boolean,
    // Aliases
    "-h": "--help",
    "-p": "--port",
    "-q": "--qr",
    "-s": "--https",
    "-H": "--hostname",
  };
  let args;
  try {
    args = arg(validArgs, {
      argv,
    });
  } catch (error) {
    if (isError(error) && error.code === "ARG_UNKNOWN_OPTION") {
      return printAndExit(error.message);
    }
    throw error;
  }
  if (args["--turbo"]) {
    printAndExit("Turbo is not supported using next-dev-https");
  }
  if (args["--help"]) {
    printAndExit(
      `Description
  Starts the application in development mode (hot-code reloading, error
  reporting, etc.)

Usage
  $ next-dev-https <dir> -p <port number>

<dir> represents the directory of the Next.js application.
If no directory is provided, the current directory will be used.

Options
  --port, -p      A port number on which to start the application
  --hostname, -H  Hostname on which to start the application (default: 0.0.0.0)
  --https, -s     Run application on https with self signed https certificate
  --qr, -q        Display QR code in terminal on start and 'q' press
  --help, -h      Displays this message
`,
      0
    );
  }
  const dir = getProjectDir(args._[0]);
  // Check if pages dir exists and warn if not
  if (!fs.existsSync(dir)) {
    printAndExit(`> No such directory exists as the project root: ${dir}`);
  }

  //Generate dev server certificate if needed.
  const cert = args["--https"] ? generateCert(dir) : undefined;

  const port = getPort(args);
  // If neither --port nor PORT were specified, it's okay to retry new ports.
  const allowRetry =
    args["--port"] === undefined && process.env.PORT === undefined;
  // We do not set a default host value here to prevent breaking
  // some set-ups that rely on listening on other interfaces
  const host = args["--hostname"];
  const devServerOptions = {
    allowRetry,
    dev: true,
    dir,
    hostname: host,
    isNextDevCommand: true,
    cert,
    port,
    qr: !!args["--qr"],
  };

  startServer(devServerOptions)
    .then(async (app) => {
      const appUrls = [
        ...(app.hostname === "localhost" ? getLocalIpV4Address() : []),
        app.hostname,
      ].map(
        (hostname) =>
          `http${devServerOptions.cert ? "s" : ""}://${hostname}:${app.port}`
      );
      //Here we're supposed to emit to some byzantine state machine in next/build/output that must have been built when redux was cool.
      //Anyway it seems fine to just log directly?
      console.log(
        `\x1b[32mready\x1b[0m - started server on ${host || "0.0.0.0"}:${
          app.port
        }, urls: ${appUrls.join(", ")}`
      );
      const qrPrint =
        devServerOptions.qr &&
        appUrls[0] &&
        ((big = false) => {
          const qrcodeUrl = appUrls[0];
          if (!qrcodeUrl) {
            return;
          }
          console.log(`QR code for ${qrcodeUrl} is:`);
          if (app.hostname !== "localhost") {
            console.warn(
              `\x1b[33mnote\x1b[0m - Server is running with explicit hostname ${app.hostname}. This address must be available on shared network for external device access.`
            );
          }
          qrcode.generate(qrcodeUrl, { small: !big });
        });
      
      const acceptsInput =
        process.stdin.isTTY && typeof process.stdin.setRawMode === "function";
      
      if (qrPrint) {
        qrPrint();
        acceptsInput &&
          console.log("Enter 'q' or 'Q' to display this QR again");
      }
      await app.prepare();
      //Hijack stdin if user should be able to reprint qr.
      if (qrPrint && acceptsInput) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", function (/** @type {string} */ key) {
          // ctrl-c ( end of text )
          if (key === "\u0003") {
            process.nextTick(() => process.exit(1));
          }
          if (key === "q") {
            return qrPrint();
          }
          if (key === "Q") {
            return qrPrint(true);
          }
          process.stdout.write(key);
        });
      }
    })
    .catch((err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `Port ${port} is already in use. Use other port by running script with: -p <some other port>`
        );
      } else {
        console.error(err);
      }
      process.nextTick(() => process.exit(1));
    });
  for (const CONFIG_FILE of CONFIG_FILES) {
    fs.watchFile(path.join(dir, CONFIG_FILE), (cur, prev) => {
      if (cur.size > 0 || prev.size > 0) {
        console.log(
          `\n> Found a change in ${CONFIG_FILE}. Restart the server to see the changes in effect.`
        );
      }
    });
  }
};

/**
 *
 * @param {{allowRetry: boolean, keepAliveTimeout?: number, port: number, hostname?: string, dev: boolean, cert?: {key: string, cert: string}}} opts
 * @returns
 */
function startServer(opts) {
  /** @type { import("next/dist/server/next").RequestHandler } */
  let requestHandler;
  /** @type {(listener: import("http").RequestListener) => http.Server} */
  const createServer = opts.cert
    ? https.createServer.bind(https, {
        cert: opts.cert.cert,
        key: opts.cert.key,
      })
    : http.createServer;
  const server = createServer((req, res) => {
    return requestHandler(req, res);
  });
  if (opts.keepAliveTimeout) {
    server.keepAliveTimeout = opts.keepAliveTimeout;
  }
  return new Promise((resolve, reject) => {
    let port = opts.port;
    let retryCount = 0;
    server.on("error", (err) => {
      if (
        port &&
        opts.allowRetry &&
        isError(err) &&
        err.code === "EADDRINUSE" &&
        retryCount < 10
      ) {
        console.warn(`Port ${port} is in use, trying ${port + 1} instead.`);
        port += 1;
        retryCount += 1;
        server.listen(port, opts.hostname);
      } else {
        reject(err);
      }
    });
    /** @type { ReturnType<import("next/dist/server/next").NextServer["getUpgradeHandler"]> } */
    let upgradeHandler;
    if (!opts.dev) {
      server.on("upgrade", (req, socket, upgrade) => {
        upgradeHandler(req, socket, upgrade);
      });
    }
    server.on("listening", () => {
      const addr = server.address();
      const hostname =
        !opts.hostname || opts.hostname === "0.0.0.0"
          ? "localhost"
          : opts.hostname;
      const app = next.default({
        ...opts,
        hostname,
        customServer: false,
        httpServer: server,
        port: addr && typeof addr === "object" ? addr.port : port,
      });
      requestHandler = app.getRequestHandler();
      upgradeHandler = app.getUpgradeHandler();
      resolve(app);
    });
    server.listen(port, opts.hostname);
  });
}

exports.nextDev = nextDev;
