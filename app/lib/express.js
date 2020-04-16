const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
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
  identityFilename,
  ssbFolder,
} = require("./utils");
const queries = require("./queries");
const serveBlobs = require("./serve-blobs");
const cookieParser = require("cookie-parser");
const debug = require("debug")("express");
const fileUpload = require("express-fileupload");
const Sentry = require("@sentry/node");
const metrics = require("./metrics");
const sgMail = require("@sendgrid/mail");
const ejs = require("ejs");

let ssbServer;
let mode = process.env.MODE || "client";

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}/secret`
);
let syncing = false;

Client(ssbSecret, ssbConfig, async (err, server) => {
  if (err) throw err;

  ssbServer = server;
  queries.progress(
    ssbServer,
    ({ rate, feeds, incompleteFeeds, progress, total }) => {
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
    }
  );
  console.log("SSB Client ready");
});

let profileUrl = (id, path = "") => {
  return `/profile/${id}${path}`;
};

const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN && process.env.NODE_ENV == "production") {
  Sentry.init({
    dsn: SENTRY_DSN,
  });
  // Sentry request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
}
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

  req.context = {
    syncing: syncing,
  };
  res.locals.context = req.context;
  try {
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
  res.render("login", { mode });
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

    await queries.autofollow(ssbServer, decodedKey.id);

    res.redirect("/");
  } catch (e) {
    debug("Error on login", e);
    res.send("Invalid key");
  }
});

router.get("/download", (_req, res) => {
  res.render("download");
});

router.get("/logout", async (_req, res) => {
  res.clearCookie("ssb_key");
  res.redirect("/");
});

router.get("/signup", (req, res) => {
  if (req.context.profile) {
    return res.redirect("/");
  }

  res.render("signup", { mode });
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

  debug("Published about", { about: profileId, name, image: pictureLink });

  await queries.autofollow(ssbServer, profileId);

  res.redirect("/keys");
});

router.get("/keys", (req, res) => {
  res.render("keys", {
    useEmail: process.env.SENDGRID_API_KEY,
    key: req.cookies["ssb_key"],
  });
});

router.post("/keys/email", async (req, res) => {
  const email = req.body.email;
  const origin = req.body.origin;

  let html = await ejs.renderFile("views/email_sign_in.ejs", {
    origin,
    ssb_key: req.cookies["ssb_key"],
  });

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email,
    from: "Social <rgrchvs@gmail.com>",
    subject: `Login button for ${req.context.profile.name}`,
    html,
  };
  await sgMail.send(msg);

  res.redirect("/");
});

router.get("/keys/copy", (req, res) => {
  res.render("keys_copy", { key: req.cookies["ssb_key"] });
});

router.get("/keys/download", async (req, res) => {
  const identities = await ssbServer.identities.list();
  const index = identities.indexOf(req.context.profile.id) - 1;
  const filename = identityFilename(index);
  const secretPath = `${ssbFolder()}/identities/${filename}`;

  res.attachment("secret");
  res.sendFile(secretPath);
});

router.get("/profile/:id(*)", async (req, res) => {
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

  res.redirect(profileUrl(id));
});

router.post("/profile/:id/reject_friend", async (req, res) => {
  const id = req.params.id;
  if (id == req.context.profile.id) {
    throw "cannot reject yourself";
  }

  await ssbServer.identities.publishAs({
    id: req.context.profile.id,
    private: false,
    content: {
      type: "contact",
      contact: id,
      following: false,
    },
  });

  res.redirect(profileUrl(id));
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
  const { name, description } = req.body;
  const picture = req.files && req.files.pic;

  const pictureLink = picture && (await uploadPicture(ssbServer, picture));

  let update = {
    type: "about",
    about: req.context.profile.id,
  };
  if (name && name != req.context.profile.name) {
    update.name = name;
  }
  if (description && description != req.context.profile.description) {
    update.description = description;
  }
  if (pictureLink) {
    update.image = pictureLink;
  }

  if (update.name || update.image || update.description) {
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

router.get("/debug-error", (_req, res) => {
  const object = {};
  object.isUndefinedAFunction();

  res.send("should never reach here");
});

router.get("/search", async (req, res) => {
  const query = req.query.query;

  const people = await queries.searchPeople(ssbServer, query);
  metrics.searchResults.observe(people.length);

  res.render("search", { people, query });
});

router.get("/blob/*", (req, res) => {
  serveBlobs(ssbServer)(req, res);
});

router.get("/syncing", (req, res) => {
  res.json({ syncing });
});

router.get("/metrics", (_req, res) => {
  res.set("Content-Type", metrics.register.contentType);
  res.end(metrics.register.metrics());
});

if (SENTRY_DSN && process.env.NODE_ENV == "production") {
  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());
}

app.use((error, _req, res, _next) => {
  res.statusCode = 500;
  res.render("error", { error });
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
