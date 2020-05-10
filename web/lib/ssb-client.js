const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
const queries = require("./queries");
const debug = require("debug")("express");
const metrics = require("./metrics");
const { ssbFolder } = require("./utils");
const fetch = require("node-fetch").default;

let ssbClient;
let syncing = false;
let indexing = true;

const mode = process.env.MODE || "standalone";
const ssbSecret = ssbKeys.loadOrCreateSync(`${ssbFolder()}/secret`);

const connectClient = (ssbSecret) => {
  Client(ssbSecret, ssbConfig, async (err, server) => {
    if (err) {
      console.error("Failed connecting to ssb-server", err);
      console.log("Trying again...");
      setTimeout(() => connectClient(ssbSecret), 1000);
      return;
    }

    ssbClient = server;

    checkIndexing();
    queries.progress(({ rate, feeds, incompleteFeeds, progress, total }) => {
      if (incompleteFeeds > 0) {
        if (!syncing) debug("syncing");
        syncing = true;
      } else {
        syncing = false;
      }

      metrics.ssbProgressRate.set(rate);
      metrics.ssbProgressFeeds.set(feeds);
      metrics.ssbProgressIncompleteFeeds.set(incompleteFeeds);
      metrics.ssbProgressProgress.set(progress);
      metrics.ssbProgressTotal.set(total);
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

const checkIndexing = async () => {
  if (!ssbClient) return;

  const { indexes } = await ssbClient.progress();
  const { start, current, target } = indexes;

  metrics.ssbIndexingStart.set(start);
  metrics.ssbIndexingCurrent.set(current);
  metrics.ssbIndexingTarget.set(target);

  if (current < target) {
    if (!indexing) debug("indexing");
    indexing = true;
  } else {
    indexing = false;
  }
};

if (!global.checkIndexingInterval) {
  global.checkIndexingInterval = setInterval(checkIndexing, 1000);
}

connectClient(ssbSecret);

module.exports.client = () => ssbClient;
module.exports.getStatus = () =>
  indexing ? "indexing" : syncing ? "syncing" : "ready";
module.exports.reconnectWith = connectClient;
