try {
  const fs = require("fs");
  const path = require("path");
  const { writeKey, ssbFolder } = require("./utils");
  const SecretStack = require("secret-stack");
  const mkdirp = require("mkdirp");
  const ssbKeys = require("ssb-keys");
  const keys = ssbKeys.generate();
  console.log("keys", keys);

  // require("sodium-chloride");
  // require("sodium-chloride-native-nodejs-mobile");
  // require("sodium-native-nodejs-mobile");

  // console.log("ssbFolder", ssbFolder());

  // const folderExists = fs.existsSync(ssbFolder());
  // if (!folderExists) mkdirp.sync(ssbFolder());

  // const keysPath = path.join(ssbFolder(), "/secret");
} catch (e) {
  console.log("error", e);
}
// const keys = ssbKeys.loadOrCreateSync(keysPath);

// // Need to use secret-stack directly instead of ssb-server here otherwise is not compatible with patchwork .ssb folder
// const Server = require("secret-stack")();
// .use(require("ssb-db"))
// .use(require("ssb-master"));
//   .use(require("ssb-gossip"))
//   .use(require("ssb-replicate"))
//   .use(require("ssb-backlinks"))
//   .use(require("ssb-about"))
//   .use(require("ssb-contacts"))
//   .use(require("ssb-invite"))
//   .use(require("./monkeypatch/ssb-friends"))
//   .use(require("ssb-query"))
//   .use(require("ssb-device-address"))
//   .use(require("./plugins/memory-identities"))
//   .use(require("ssb-blobs"))
//   .use(require("ssb-private"));

// const config = require("./ssb-config");
// const server = Server(config);
// console.log("SSB server started at", config.port);

// // save an updated list of methods this server has made public
// // in a location that ssb-client will know to check
// const manifest = server.getManifest();
// fs.writeFileSync(
//   path.join(config.path, "manifest.json"), // ~/.ssb/manifest.json
//   JSON.stringify(manifest)
// );

// // SSB server automatically creates a secret key, but we want the user flow where they choose to create a key or use an existing one
// const mode = process.env.MODE || "standalone";
// if (mode == "standalone" && !secretExists) {
//   fs.writeFileSync(`${ssbFolder()}/logged-out`, "");
// }
