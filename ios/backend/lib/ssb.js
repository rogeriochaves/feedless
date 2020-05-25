const fs = require("fs");
const path = require("path");
const { ssbFolder } = require("./utils");

const folderExists = fs.existsSync(ssbFolder());
if (!folderExists) fs.mkdirSync(ssbFolder());

// Need to use secret-stack directly instead of ssb-server here otherwise is not compatible with patchwork .ssb folder
const Server = require("secret-stack")({
  appKey: "1KHLiKZvAvjbY1ziZEHMXawbCEIM6qwjCDm3VYRan/s=",
})
  .use(require("ssb-db"))
  .use(require("ssb-master"))
  .use(require("ssb-gossip"))
  .use(require("ssb-replicate"))
  .use(require("./monkeypatch/ssb-friends"))
  // FIXME: see issue https://github.com/ssbc/ssb-ebt/issues/33
  .use(require("ssb-ebt-fork-staltz")) // needs: db, replicate, friends
  .use(require("ssb-query"))
  .use(require("ssb-blobs"))
  .use(require("ssb-invite"))
  .use(require("./plugins/feedless-index"))
  // We don't really need multiple identities, we just use that for the publishAs function for private posts
  // without having to index with ssb-private
  .use(require("./plugins/memory-identities"));

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
if (mode == "standalone" && !folderExists) {
  fs.writeFileSync(`${ssbFolder()}/logged-out`, "");
}
