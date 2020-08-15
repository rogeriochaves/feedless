const configInject = require("ssb-config/inject");
const { ssbFolder } = require("./utils");
const path = require("path");
const ssbKeys = require("ssb-keys");

const keysPath = path.join(ssbFolder(), "/secret");
const keys = ssbKeys.loadOrCreateSync(keysPath);

module.exports = configInject("ssb", {
  path: ssbFolder(),
  keys,
  blobs: {
    sympathy: 2,
  },
  blobsPurge: {
    cpuMax: 30,
  },
  conn: {
    autostart: false,
  },
  connections: {
    incoming: {
      net: [
        {
          scope: "private",
          host: "0.0.0.0",
          transform: "shs",
          port: process.env.SSB_PORT || 8008,
        },
      ],
    },
    outgoing: {
      net: [{ transform: "shs" }],
    },
  },
  replicate: {
    legacy: false,
  },
});
