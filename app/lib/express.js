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
let context = {};

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}/secret`
);
Client(ssbSecret, ssbConfig, async (err, server) => {
  if (err) throw err;
  const whoami = await promisify(server.whoami);
  context.profile = await queries.getProfile(server, whoami.id);

  console.log("nearby pubs", await promisify(server.peerInvites.getNearbyPubs));
  console.log("getState", await promisify(server.deviceAddress.getState));

  ssbServer = server;
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use((_req, res, next) => {
  res.locals.profileUrl = (id, path = "") => {
    if (id.includes("/")) {
      return `/profile/${encodeURIComponent(id)}${path}`;
    }
    return `/profile/${id}${path}`;
  };
  res.locals.context = context;
  next();
});

const router = asyncRouter(app);

router.get("/", async (_req, res) => {
  if (!ssbServer) {
    setTimeout(() => {
      res.redirect("/");
    }, 500);
    return;
  }

  if (!context.profile.name) {
    res.redirect("/about");
  }

  const [posts, friends] = await Promise.all([
    queries.getPosts(ssbServer, context.profile),
    queries.getFriends(ssbServer, context.profile),
  ]);
  res.render("index", { posts, friends });
});

router.get("/profile/:id", async (req, res) => {
  const id = req.params.id;

  if (id == context.profile.id) {
    return res.redirect("/");
  }

  const profile = await queries.getProfile(ssbServer, id);

  const [posts, friends] = await Promise.all([
    queries.getPosts(ssbServer, profile),
    queries.getFriends(ssbServer, profile),
  ]);

  res.render("profile", { profile, posts, friends });
});

router.post("/publish", async (req, res) => {
  await promisify(ssbServer.publish, {
    type: "post",
    text: req.body.message,
    wall: context.profile.id,
  });

  res.redirect("/");
});

router.post("/profile/:id/publish", async (req, res) => {
  const id = req.params.id;

  await promisify(ssbServer.publish, {
    type: "post",
    text: req.body.message,
    wall: id,
  });

  res.redirect("/profile/" + id);
});

router.get("/pubs", async (_req, res) => {
  const invite = await promisify(ssbServer.invite.create, { uses: 10 });
  const peers = await promisify(ssbServer.gossip.peers);

  res.render("pubs", { invite, peers });
});

router.post("/pubs/add", async (req, res) => {
  const inviteCode = req.body.invite_code;

  await promisify(ssbServer.invite.accept, inviteCode);

  res.redirect("/");
});

router.get("/about", (_req, res) => {
  res.render("about");
});

router.post("/about", async (req, res) => {
  const name = req.body.name;

  if (name != context.profile.name) {
    await promisify(ssbServer.publish, {
      type: "about",
      about: context.profile.id,
      name: name,
    });
    context.profile.name = name;
  }

  res.redirect("/");
});

router.get("/debug", async (_req, res) => {
  const entries = await queries.getAllEntries(ssbServer);

  res.render("debug", { entries });
});

router.get("/search", async (req, res) => {
  const query = req.query.query;

  const people = await queries.searchPeople(ssbServer, query);

  res.render("search", { people });
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
