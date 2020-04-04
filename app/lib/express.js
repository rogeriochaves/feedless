const express = require("express");
const app = express();
const port = process.env.EXPRESS_PORT || 3000;
const bodyParser = require("body-parser");
const pull = require("pull-stream");
const Client = require("ssb-client");
const ssbKeys = require("ssb-keys");
const ssbConfig = require("./ssb-config");

let ssbServer;
let profile;

let homeFolder =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let ssbSecret = ssbKeys.loadOrCreateSync(
  `${homeFolder}/.${process.env.CONFIG_FOLDER || "ssb"}/secret`
);
Client(ssbSecret, ssbConfig, (err, server) => {
  if (err) throw err;
  ssbServer = server;
  ssbServer.whoami((err, keys) => {
    if (err) throw err;
    profile = keys;
  });
  console.log(ssbServer);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (_req, res) => {
  pull(
    ssbServer.createFeedStream(),
    pull.collect((_err, msgs) => {
      const posts = msgs.map((x) => x.value.content);

      res.render("index", { posts, profile });
    })
  );
});

app.post("/publish", (req, res) => {
  ssbServer.publish({ type: "post", text: req.body.message }, (err, msg) => {
    res.redirect("/");
  });
});

app.get("/new_invite", (_req, res) => {
  ssbServer.invite.create({ uses: 10 }, (err, invite) => {
    if (err) throw err;
    console.log("invite", invite);

    res.render("new_invite", { invite });
  });
});

app.post("/add_invite", (req, res) => {
  const inviteCode = req.body.invite_code;

  ssbServer.invite.accept(inviteCode, (err, result) => {
    if (err) throw err;
    console.log("result", result);

    res.redirect("/");
  });
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
