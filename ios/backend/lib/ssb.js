const fs = require("fs");
const path = require("path");
const { ssbFolder } = require("./utils");

const folderExists = fs.existsSync(ssbFolder());
if (!folderExists) fs.mkdirSync(ssbFolder());

const [
  secretStack,
  ssbDb,
  ssbMaster,
  ssbGossip,
  ssbReplicate,
  ssbFriends,
  ssbEbt,
  ssbQuery,
  ssbBlobs,
  ssbInvite,
  feedlessIndex,
  memoryIdentities,
] = [
  require("secret-stack"),
  require("ssb-db"),
  require("ssb-master"),
  require("ssb-gossip"),
  require("ssb-replicate"),
  require("./monkeypatch/ssb-friends"),
  require("ssb-ebt-fork-staltz"),
  require("ssb-query"),
  require("ssb-blobs"),
  require("ssb-invite"),
  require("./plugins/feedless-index"),
  require("./plugins/memory-identities"),
];

// Need to use secret-stack directly instead of ssb-server here otherwise is not compatible with patchwork .ssb folder
const Server = secretStack({
  appKey: "1KHLiKZvAvjbY1ziZEHMXawbCEIM6qwjCDm3VYRan/s=",
})
  .use(ssbDb)
  .use(ssbMaster)
  .use(ssbGossip)
  .use(ssbReplicate)
  .use(ssbFriends)
  // FIXME: see issue https://gith`ub.com/ssbc/ssb-ebt/issues/33
  .use(ssbEbt) // needs: db, replicate, friends
  .use(ssbQuery)
  .use(ssbBlobs)
  .use(ssbInvite)
  .use(feedlessIndex)
  // We don't really need multiple identities, we just use that for the publishAs function for private posts
  // without having to index with ssb-private
  .use(memoryIdentities);

const ServerRestart = secretStack({
  appKey: "1KHLiKZvAvjbY1ziZEHMXawbCEIM6qwjCDm3VYRan/s=",
})
  .use(ssbDb)
  .use(ssbMaster)
  .use(ssbGossip)
  .use(ssbFriends)
  .use(ssbQuery)
  .use(ssbBlobs)
  .use(ssbInvite)
  .use(feedlessIndex)
  .use(memoryIdentities);

const config = require("./ssb-config");

let server;
module.exports.startSSBServer = () => {
  server = Server(config);
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
};
module.exports.stopSSBServer = () => {
  server.close();
};

// fs.unlinkSync(`${ssbFolder()}/flume/log.offset`)
// let dirfiles = fs.readdirSync(ssbFolder());
// console.log("dirfiles", dirfiles);
// console.log("conn.json", fs.readFileSync(ssbFolder() + "/conn.json"));
// fs.renameSync(`${ssbFolder()}/conn.json`, `${ssbFolder()}/conn.json.bkp`);
