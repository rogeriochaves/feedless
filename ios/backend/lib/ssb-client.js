const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
const queries = require("./queries");
const debug = require("debug")("express");
const { ssbFolder } = require("./utils");
const fetch = require("node-fetch").default;

let ssbClient;
let syncing = false;

const mode = process.env.MODE || "standalone";
const ssbSecret = ssbKeys.loadOrCreateSync(`${ssbFolder()}/secret`);

const connectClient = (ssbSecret) => {
  Client(ssbSecret, ssbConfig, async (err, server) => {
    if (err) throw err;

    ssbClient = server;

    queries.progress(({ rate, feeds, incompleteFeeds, progress, total }) => {
      if (incompleteFeeds > 0) {
        if (!syncing) debug("syncing");
        syncing = true;
      } else {
        syncing = false;
      }
    });
    console.log("SSB Client ready");

    if (mode == "standalone") addFirstPub();
  });
};

const addFirstPub = async () => {
  const peers = await ssbClient.gossip.peers();
  if (peers.length == 0) {
    console.log("No pubs found, adding pub.feedless.social as a first pub");
    try {
      const response = await fetch("https://feedless.social/pub_invite");
      const { invite } = await response.json();
      await ssbClient.invite.accept(invite);
    } catch (e) {
      console.error("Could add feedless pub", e);
    }
  }
};

module.exports.client = () => ssbClient;
module.exports.isSyncing = () => syncing;
module.exports.reconnectWith = connectClient;

connectClient(ssbSecret);
