const express = require("express");
const app = express();
const port = process.env.EXPRESS_PORT || 3000;
const bodyParser = require("body-parser");
const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
const { asyncRouter } = require("./utils");
const queries = require("./queries");
const serveBlobs = require("./serve-blobs");

let ssbServer;
let context = {};

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}/secret`
);
Client(ssbSecret, ssbConfig, async (err, server) => {
  if (err) throw err;
  const whoami = await server.whoami();
  context.profile = await queries.getProfile(server, whoami.id);

  ssbServer = server;
  console.log("SSB Client ready");
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
  res.locals.imageUrl = (blob) => {
    const imageHash = blob && typeof blob == "object" ? blob.link : blob;

    return imageHash && `/blob/${encodeURIComponent(imageHash)}`;
  };
  res.locals.profileImageUrl = (profile) => {
    if (profile.image) {
      return res.locals.imageUrl(profile.image);
    }
    return "/images/no-avatar.png";
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

  const [profile, posts, friends] = await Promise.all([
    queries.getProfile(ssbServer, id),
    queries.getPosts(ssbServer, { id }),
    queries.getFriends(ssbServer, { id }),
  ]);

  res.render("profile", { profile, posts, friends });
});

router.post("/publish", async (req, res) => {
  await ssbServer.publish({
    type: "post",
    text: req.body.message,
    root: context.profile.id,
  });

  res.redirect("/");
});

router.post("/profile/:id/publish", async (req, res) => {
  const id = req.params.id;

  await ssbServer.publish({
    type: "post",
    text: req.body.message,
    root: id,
  });

  res.redirect("/profile/" + id);
});

router.get("/pubs", async (_req, res) => {
  const invite = await ssbServer.invite.create({ uses: 10 });
  const peers = await ssbServer.gossip.peers();

  res.render("pubs", { invite, peers });
});

router.post("/pubs/add", async (req, res) => {
  const inviteCode = req.body.invite_code;

  await ssbServer.invite.accept(inviteCode);

  res.redirect("/");
});

router.get("/about", (_req, res) => {
  res.render("about");
});

router.post("/about", async (req, res) => {
  const name = req.body.name;

  if (name != context.profile.name) {
    await ssbServer.publish({
      type: "about",
      about: context.profile.id,
      name: name,
    });
    context.profile.name = name;
  }

  res.redirect("/");
});

router.get("/debug", async (req, res) => {
  const query = req.query || {};

  const entries = await queries.getAllEntries(ssbServer, query);

  res.render("debug", { entries, query });
});

router.get("/search", async (req, res) => {
  const query = req.query.query;

  const people = await queries.searchPeople(ssbServer, query);

  res.render("search", { people, query });
});

router.get("/blob/*", (req, res) => {
  serveBlobs(ssbServer)(req, res);
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
