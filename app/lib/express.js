const express = require("express");
const app = express();
const port = process.env.EXPRESS_PORT || 3000;
const bodyParser = require("body-parser");
const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
const { promisify, asyncRouter } = require("./utils");
const queries = require("./queries");

let ssbServer;
let profile;

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}/secret`
);
Client(ssbSecret, ssbConfig, async (err, server) => {
  if (err) throw err;
  profile = await promisify(server.whoami);
  profile.name = await promisify(server.about.latestValue, {
    key: "name",
    dest: profile.id,
  });

  console.log("nearby pubs", await promisify(server.peerInvites.getNearbyPubs));
  console.log("getState", await promisify(server.deviceAddress.getState));

  ssbServer = server;
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

const router = asyncRouter(app);

router.get("/", async (_req, res) => {
  if (!ssbServer) {
    setTimeout(() => {
      res.redirect("/");
    }, 500);
    return;
  }

  if (!profile.name) {
    res.redirect("/about");
  }

  const [posts, friends] = await Promise.all([
    queries.getPosts(ssbServer),
    queries.getFriends(profile, ssbServer),
  ]);
  res.render("index", { profile, posts, friends });
});

router.post("/publish", async (req, res) => {
  await promisify(ssbServer.publish, { type: "post", text: req.body.message });

  res.redirect("/");
});

router.get("/pubs", async (_req, res) => {
  const invite = await promisify(ssbServer.invite.create, { uses: 10 });
  const peers = await promisify(ssbServer.gossip.peers);

  res.render("pubs", { invite, peers, profile });
});

router.post("/pubs/add", async (req, res) => {
  const inviteCode = req.body.invite_code;

  await promisify(ssbServer.invite.accept, inviteCode);

  res.redirect("/");
});

router.get("/about", (_req, res) => {
  res.render("about", { profile });
});

router.post("/about", async (req, res) => {
  const name = req.body.name;

  if (name != profile.name) {
    await promisify(ssbServer.publish, {
      type: "about",
      about: profile.id,
      name: name,
    });
    profile.name = name;
  }

  res.redirect("/");
});

router.get("/debug", async (_req, res) => {
  const entries = await queries.getAllEntries(ssbServer);

  res.render("debug", { profile, entries });
});

router.get("/search", async (req, res) => {
  const query = req.query.query;

  const people = await queries.searchPeople(ssbServer, query);

  res.render("search", { profile, people });
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
