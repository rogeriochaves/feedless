const prometheus = require("prom-client");

const collectDefaultMetrics = prometheus.collectDefaultMetrics;
const register = prometheus.register;
collectDefaultMetrics({ register });

const ssbProgressRate = new prometheus.Gauge({
  name: "ssb_progress_rate",
  help: "Tracks ssb syncing progress rate",
});

const ssbProgressFeeds = new prometheus.Gauge({
  name: "ssb_progress_feeds",
  help: "Tracks ssb syncing progress feeds",
});

const ssbProgressIncompleteFeeds = new prometheus.Gauge({
  name: "ssb_progress_incomplete_feeds",
  help: "Tracks ssb syncing progress incomplete feeds",
});

const ssbProgressProgress = new prometheus.Gauge({
  name: "ssb_progress_progress",
  help: "Tracks ssb syncing progress progress",
});

const ssbProgressTotal = new prometheus.Gauge({
  name: "ssb_progress_total",
  help: "Tracks ssb syncing progress total",
});

module.exports = {
  register,
  ssbProgressRate,
  ssbProgressFeeds,
  ssbProgressIncompleteFeeds,
  ssbProgressProgress,
  ssbProgressTotal,
};
