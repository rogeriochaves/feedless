const fs = require("fs");
const path = require("path");

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbFolder = `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}`;
let secretPath = `${ssbFolder}/secret`;
let envKey =
  process.env.SSB_KEY &&
  Buffer.from(process.env.SSB_KEY, "base64").toString("utf8");
if (envKey) {
  console.log("Using env SSB_KEY");
  fs.mkdirSync(ssbFolder, { recursive: true });
  fs.writeFileSync(secretPath, envKey);
}

const Server = require("ssb-server");
const config = require("./ssb-config");

// add plugins
Server.use(require("ssb-master"))
  .use(require("ssb-gossip"))
  .use(require("ssb-replicate"))
  .use(require("ssb-backlinks"))
  .use(require("ssb-about"))
  .use(require("ssb-contacts"))
  .use(require("ssb-invite"))
  .use(require("ssb-friends"))
  .use(require("ssb-query"))
  .use(require("ssb-device-address"))
  .use(require("ssb-identities"))
  .use(require("ssb-peer-invites"))
  .use(require("ssb-blobs"))
  .use(require("ssb-private"));

const server = Server(config);
console.log("SSB server started at", config.port);

// save an updated list of methods this server has made public
// in a location that ssb-client will know to check
const manifest = server.getManifest();
fs.writeFileSync(
  path.join(config.path, "manifest.json"), // ~/.ssb/manifest.json
  JSON.stringify(manifest)
);
