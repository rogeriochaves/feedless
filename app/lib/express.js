const express = require("express");
const app = express();
const port = process.env.EXPRESS_PORT || 3000;
const bodyParser = require("body-parser");
const pull = require("pull-stream");
const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");
const { promisify, asyncRouter } = require("./utils");

let ssbServer;
let profile;

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "social"}/secret`
);
Client(ssbSecret, ssbConfig, async (err, server) => {
  if (err) throw err;
  ssbServer = server;
  profile = await promisify(ssbServer.whoami);

  console.log(
    "nearby pubs",
    await promisify(ssbServer.peerInvites.getNearbyPubs)
  );
  console.log("getState", await promisify(ssbServer.deviceAddress.getState));

  console.log("ssbServer", ssbServer);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

const router = asyncRouter(app);

router.get("/", (_req, res) => {
  if (!ssbServer) {
    setTimeout(() => {
      res.redirect("/");
    }, 500);
    return;
  }

  pull(
    ssbServer.query.read({ limit: 10, reverse: true }),
    pull.collect((_err, msgs) => {
      const posts = msgs.map((x) => x.value.content);

      res.render("index", { posts, profile });
    })
  );
});

router.post("/publish", async (req, res) => {
  await promisify(ssbServer.publish, { type: "post", text: req.body.message });

  res.redirect("/");
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

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
