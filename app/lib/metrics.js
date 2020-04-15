const prometheus = require("prom-client");

const collectDefaultMetrics = prometheus.collectDefaultMetrics;
const register = prometheus.register;
collectDefaultMetrics({ register });

const { Gauge, Summary, Counter } = prometheus;

module.exports = {
  register,
  router: new Counter({
    name: "router",
    help: "Routes accessed by users",
    labelNames: ["method", "path"],
  }),
  ssbProgressRate: new Gauge({
    name: "ssb_progress_rate",
    help: "Tracks ssb syncing progress rate",
  }),
  ssbProgressFeeds: new Gauge({
    name: "ssb_progress_feeds",
    help: "Tracks ssb syncing progress feeds",
  }),
  ssbProgressIncompleteFeeds: new Gauge({
    name: "ssb_progress_incomplete_feeds",
    help: "Tracks ssb syncing progress incomplete feeds",
  }),
  ssbProgressProgress: new Gauge({
    name: "ssb_progress_progress",
    help: "Tracks ssb syncing progress progress",
  }),
  ssbProgressTotal: new Gauge({
    name: "ssb_progress_total",
    help: "Tracks ssb syncing progress total",
  }),
  searchResults: new Summary({
    name: "search_results",
    help: "Amount of results returned from search",
  }),
};
