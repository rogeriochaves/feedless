const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
const queries = require("./queries");
const debug = require("debug")("express");
const metrics = require("./metrics");
const { ssbFolder } = require("./utils");

let ssbClient;

let ssbSecret = ssbKeys.loadOrCreateSync(`${ssbFolder()}/secret`);
let syncing = false;

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

      metrics.ssbProgressRate.set(rate);
      metrics.ssbProgressFeeds.set(feeds);
      metrics.ssbProgressIncompleteFeeds.set(incompleteFeeds);
      metrics.ssbProgressProgress.set(progress);
      metrics.ssbProgressTotal.set(total);
    });
    console.log("SSB Client ready");
  });
};

module.exports.client = () => ssbClient;
module.exports.isSyncing = () => syncing;
module.exports.reconnectWith = connectClient;

connectClient(ssbSecret);
