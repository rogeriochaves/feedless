const debug = require("debug")("express");
const { connectServer } = require("./ssb");
const { startExpressServer } = require("./express");
const { client, connectClient, clearClient } = require("./ssb-client");

console.log("startExpressServer", startExpressServer);

let indexingState = { current: 0, target: 0 };

const checkIndexing = async () => {
  if (!client) return;

  let indexes;
  try {
    indexes = (await client().progress()).indexes;
  } catch (e) {
    console.log("Check indexing error", e);
    clearClient();
    startExpressServer();
    connectServer();
    connectClient();
    return;
  }
  const { start, current, target } = indexes;

  indexingState = { current: current - start, target: target - start };

  if (current < target) {
    if (!indexing) debug("indexing");
    indexing = true;
  } else {
    if (indexing) debug("finish indexing");
    indexing = false;
  }
};

setInterval(checkIndexing, 1000);

module.exports.getIndexingState = () => indexingState;
