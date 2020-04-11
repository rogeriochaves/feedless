const express = require("express");
const app = express();
const port = process.env.EXPRESS_PORT || 3000;
const bodyParser = require("body-parser");
const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
const {
  asyncRouter,
  writeKey,
  nextIdentityFilename,
  reconstructKeys,
  readKey,
  uploadPicture,
} = require("./utils");
const queries = require("./queries");
const serveBlobs = require("./serve-blobs");
const cookieParser = require("cookie-parser");
const debug = require("debug")("express");
const fileUpload = require("express-fileupload");

let ssbServer;
let mode = process.env.MODE || "server";

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}/secret`
);
Client(ssbSecret, ssbConfig, async (err, server) => {
  if (err) throw err;

  ssbServer = server;
  console.log("SSB Client ready");
});

let profileUrl = (id, path = "") => {
  if (id.includes("/")) {
    return `/profile/${encodeURIComponent(id)}${path}`;
  }
  return `/profile/${id}${path}`;
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(cookieParser());
app.use(fileUpload());
app.use(async (req, res, next) => {
  if (!ssbServer) {
    setTimeout(() => {
      console.log("Waiting for SSB to load...");

      res.redirect("/");
    }, 500);
    return;
  }

  req.context = {};
  res.locals.context = req.context;
  try {
    if (mode == "client") {
      const whoami = await server.whoami();
      req.context.profile = await queries.getProfile(server, whoami.id);

      next();
    } else {
      const identities = await ssbServer.identities.list();
      const key = req.cookies["ssb_key"];
      if (!key) return next();

      const parsedKey = JSON.parse(key);
      if (!identities.includes(parsedKey.id)) {
        const filename = await nextIdentityFilename(ssbServer);

        writeKey(key, `/identities/${filename}`);
        ssbServer.identities.refresh();
      }
      req.context.profile = await queries.getProfile(ssbServer, parsedKey.id);

      next();
    }
  } catch (e) {
    next(e);
  }
});
app.use((_req, res, next) => {
  res.locals.profileUrl = profileUrl;
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
  next();
});

const router = asyncRouter(app);

router.get("/", async (req, res) => {
  if (!req.context.profile) {
    return res.render("index");
  }
  if (!req.context.profile.name) {
    return res.redirect("/about");
  }

  const [posts, friends, vanishingMessages] = await Promise.all([
    queries.getPosts(ssbServer, req.context.profile),
    queries.getFriends(ssbServer, req.context.profile),
    queries.getVanishingMessages(ssbServer, req.context.profile),
  ]);
  res.render("home", {
    posts,
    friends,
    vanishingMessages,
    profile: req.context.profile,
  });
});

router.get("/login", (_req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  const submittedKey =
    req.files && req.files.ssb_key
      ? req.files.ssb_key.data.toString()
      : req.body.ssb_key;

  try {
    const decodedKey = reconstructKeys(submittedKey);
    res.cookie("ssb_key", JSON.stringify(decodedKey));

    decodedKey.private = "[removed]";
    debug("Login with key", decodedKey);

    res.redirect("/");
  } catch (e) {
    debug("Error on login", e);
    res.send("Invalid key");
  }
});

router.get("/logout", async (_req, res) => {
  res.clearCookie("ssb_key");
  res.redirect("/");
});

router.get("/signup", (req, res) => {
  if (req.context.profile) {
    return res.redirect("/");
  }

  res.render("signup");
});

router.post("/signup", async (req, res) => {
  const name = req.body.name;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssbServer, picture));

  const filename = await nextIdentityFilename(ssbServer);
  const profileId = await ssbServer.identities.create();
  const key = readKey(`/identities/${filename}`);
  if (key.id != profileId)
    throw "profileId and key.id don't match, probably race condition, bailing out for safety";

  debug("Created new user with id", profileId);

  res.cookie("ssb_key", JSON.stringify(key));
  key.private = "[removed]";
  debug("Generated key", key);

  await ssbServer.identities.publishAs({
    id: profileId,
    private: false,
    content: {
      type: "about",
      about: profileId,
      name: name,
      ...(pictureLink ? { image: pictureLink } : {}),
    },
  });
  debug("Published about", { about: profileId, name, image: pictureLink });

  res.redirect("/");
});

router.get("/profile/:id", async (req, res) => {
  const id = req.params.id;

  if (id == req.context.profile.id) {
    return res.redirect("/");
  }

  const [profile, posts, friends, friendshipStatus] = await Promise.all([
    queries.getProfile(ssbServer, id),
    queries.getPosts(ssbServer, { id }),
    queries.getFriends(ssbServer, { id }),
    queries.getFriendshipStatus(ssbServer, req.context.profile.id, id),
  ]);

  res.render("profile", { profile, posts, friends, friendshipStatus });
});

router.post("/profile/:id/add_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.profile.id) {
    throw "cannot befriend yourself";
  }

  await ssbServer.identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: true,
    },
  });

  res.redirect(`/profile/${id}`);
});

router.post("/publish", async (req, res) => {
  await ssbServer.identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "post",
      text: req.body.message,
      root: req.context.profile.id,
    },
  });

  res.redirect("/");
});

// TODO: tie reading with deleting
router.post("/vanish", async (req, res) => {
  const key = req.body.key;

  await ssbServer.identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "delete",
      dest: key,
    },
  });

  res.send("ok");
});

router.post("/profile/:id/publish", async (req, res) => {
  const id = req.params.id;
  const visibility = req.body.visibility;

  if (visibility == "vanishing") {
    await ssbServer.identities.publishAs({
      id: req.context.profile.id,
      private: true,
      content: {
        type: "post",
        text: req.body.message,
        root: id,
        recps: [id],
      },
    });
  } else {
    await ssbServer.identities.publishAs({
      id: req.context.profile.id,
      private: false,
      content: {
        type: "post",
        text: req.body.message,
        root: id,
      },
    });
  }

  res.redirect(profileUrl(id));
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
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssbServer, picture));

  let update = {
    type: "about",
    about: req.context.profile.id,
  };
  if (name && name != req.context.profile.name) {
    update.name = name;
  }
  if (pictureLink) {
    update.image = pictureLink;
  }

  if (update.name || update.image) {
    await ssbServer.identities.publishAs({
      id: req.context.profile.id,
      private: false,
      content: update,
    });

    delete queries.profileCache[req.context.profile.id];
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
