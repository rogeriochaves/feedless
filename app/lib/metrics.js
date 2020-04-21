const prometheus = require("prom-client");

const collectDefaultMetrics = prometheus.collectDefaultMetrics;
const register = prometheus.register;
collectDefaultMetrics({ register });

const { Gauge, Summary, Counter } = prometheus;

module.exports = {
  register,
  router: new Counter({
    name: "social_router",
    help: "Routes accessed by users",
    labelNames: ["method", "path"],
  }),
  ssbProgressRate: new Gauge({
    name: "social_ssb_progress_rate",
    help: "Tracks ssb syncing progress rate",
  }),
  ssbProgressFeeds: new Gauge({
    name: "social_ssb_progress_feeds",
    help: "Tracks ssb syncing progress feeds",
  }),
  ssbProgressIncompleteFeeds: new Gauge({
    name: "social_ssb_progress_incomplete_feeds",
    help: "Tracks ssb syncing progress incomplete feeds",
  }),
  ssbProgressProgress: new Gauge({
    name: "social_ssb_progress_progress",
    help: "Tracks ssb syncing progress progress",
  }),
  ssbProgressTotal: new Gauge({
    name: "social_ssb_progress_total",
    help: "Tracks ssb syncing progress total",
  }),
  searchResultsPeople: new Summary({
    name: "social_search_results_people",
    help: "Amount of people results returned from search",
  }),
  searchResultsCommunities: new Summary({
    name: "social_search_results_communities",
    help: "Amount of communities results returned from search",
  }),
};
