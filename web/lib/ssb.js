const fs = require("fs");
const path = require("path");
const { writeKey, ssbFolder } = require("./utils");

const envKey =
  process.env.SSB_KEY &&
  Buffer.from(process.env.SSB_KEY, "base64").toString("utf8");
const secretExists = fs.existsSync(`${ssbFolder()}/secret`);

if (!secretExists && envKey) {
  writeKey(envKey, "/secret");
  console.log("Writing SSB_KEY from env");
  if (!fs.existsSync(`${ssbFolder()}/gossip.json`)) {
    fs.copyFileSync("gossip.json", `${ssbFolder()}/gossip.json`);
  }
}

// Need to use secret-stack directly instead of ssb-server here otherwise is not compatible with patchwork .ssb folder
const Server = require("secret-stack")()
  .use(require("ssb-db"))
  .use(require("ssb-master"))
  .use(require("ssb-gossip"))
  .use(require("ssb-replicate"))
  .use(require("ssb-invite"))
  .use(require("./monkeypatch/ssb-friends"))
  .use(require("ssb-query"))
  .use(require("./plugins/memory-identities"))
  .use(require("ssb-blobs"))
  .use(require("./plugins/private-index"))
  .use(require("./plugins/encrypted-view"));

const config = require("./ssb-config");
const server = Server(config);
console.log("SSB server started at", config.port);

// save an updated list of methods this server has made public
// in a location that ssb-client will know to check
const manifest = server.getManifest();
fs.writeFileSync(
  path.join(config.path, "manifest.json"), // ~/.ssb/manifest.json
  JSON.stringify(manifest)
);

// SSB server automatically creates a secret key, but we want the user flow where they choose to create a key or use an existing one
const mode = process.env.MODE || "standalone";
if (mode == "standalone" && !secretExists) {
  fs.writeFileSync(`${ssbFolder()}/logged-out`, "");
}
