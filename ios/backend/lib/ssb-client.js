const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const queries = require("./queries");
const debug = require("debug")("express");
const { ssbFolder } = require("./utils");
const fetch = require("node-fetch").default;

let ssbClient;
let status = "indexing";

const ssbSecret = ssbKeys.loadOrCreateSync(`${ssbFolder()}/secret`);

const connectClient = (ssbSecret) => {
  Client(
    ssbSecret,
    {
      host: "127.0.0.1",
      port: process.env.SSB_PORT || 8008,
      key: ssbSecret.id,
      caps: {
        shs: "1KHLiKZvAvjbY1ziZEHMXawbCEIM6qwjCDm3VYRan/s=",
      },
    },
    (err, server) => {
      if (err) {
        console.log("err", err, "trying to reconnect in 1s");
        setTimeout(() => connectClient(ssbSecret), 1000);
        return;
      }
      console.log("conncetion successfull!");

      ssbClient = server;

      queries.progress((data) => {
        const { incompleteFeeds } = data;
        if (incompleteFeeds > 0) {
          if (status != "syncing") debug("syncing");
          status = "syncing";
        } else {
          if (status != "ready") debug("ready");
          status = "ready";
        }
      });
      console.log("SSB Client ready");

      addFirstPub();
    }
  );
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
module.exports.getStatus = () => status;
module.exports.reconnectWith = connectClient;

connectClient(ssbSecret);
