#!/usr/bin/env node
const { nextDev } = require("./src/server");
nextDev(process.argv.slice(2));
