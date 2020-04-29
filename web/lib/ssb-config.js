const configInject = require("ssb-config/inject");

module.exports = configInject(process.env.CONFIG_FOLDER || "feedless", {
  connections: {
    incoming: {
      net: [
        {
          scope: "public",
          host: "0.0.0.0",
          external: ["lvh.me"],
          transform: "shs",
          port: process.env.SSB_PORT || 8008,
        },
      ],
    },
    outgoing: {
      net: [{ transform: "shs" }],
    },
  },
});
