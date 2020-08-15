console.log("Loading nodejs");

const targetEnvironment = process.argv[4];
if (targetEnvironment == "iphoneos") {
  require("../" + "override-dlopen-paths-preload"); // to go around noderify, as it overrides __dirname
}

const { startSSBServer, stopSSBServer } = require("./lib/ssb");
const { startExpressServer, stopExpressServer } = require("./lib/express");
const ssb = require("./lib/ssb-client");

let firstTime = true;
const controlFileHandler = process.argv[5];
if (controlFileHandler) {
  const readline = require("readline");
  const fs = require("fs");
  // Accept control messages coming from a file descriptor.
  let rlControl = readline.createInterface(
    fs.createReadStream("", {
      fd: parseInt(controlFileHandler),
    })
  );
  rlControl.on("line", (line) => {
    line = line.toString();
    if (line.match(/^SUSPEND/)) {
      // console.error("Node.js Suspending...");
      // stopSSBServer();
      // stopSSBClient();
      // stopExpressServer();
      // console.error("Node.js Suspended.");
    } else if (line.match(/^RESUME/)) {
      if (firstTime) {
        firstTime = false;
        return;
      }
      console.error("Node.js Resuming...");
      let client = ssb.client();
      if (!client) return;
      client.progress().catch((e) => {
        console.log("Progress check failed, harakiri");
        process.exit(0);
      });
      // startSSBServer();
      // startExpressServer();
      // reconnectSSBClient();
      console.error("Node.js Resumed.");
    } else {
      console.error(`unknown control command: ${line}`);
    }
  });
}

let restarting = false;
process.on("unhandledRejection", (reason, _promise) => {
  if (reason == "CheckIndexingError") {
    // if (restarting) return;
    // startSSBServer();
    // // reconnectSSBClient();
    // startExpressServer();
    // // restarting = true;
    // // console.log("Restarting servers");
    // // process.kill(process.pid, "SIGTERM");
    // return;
  }
  console.log("unhandledRejection", reason);
});

// setTimeout(() => {
//   process.kill(process.pid, "SIGTERM");
// }, 5000);

// process.on("SIGTERM", function () {
//   console.log("On SIGTERM");
//   setTimeout(() => {
//     console.log("on settimeout");
//     startSSBServer();
//     reconnectSSBClient();
//     startExpressServer();
//   }, 1000);
// });

process.on("uncaughtException", (err) => {
  // This happens when we restart SSB server after phone lock, just ignore it
  // if (err.toString().includes("IO error: lock")) return;
  console.log("uncaughtException", err);
});

startSSBServer();

setTimeout(() => {
  startExpressServer();
}, 1000);
