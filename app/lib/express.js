const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const pull = require("pull-stream");
const Client = require("ssb-client");

let ssbServer;
let ssbKeys;
Client((err, server) => {
  if (err) throw err;
  ssbServer = server;
  ssbServer.whoami((err, keys) => {
    if (err) throw err;
    ssbKeys = keys;
  });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (_req, res) => {
  pull(
    ssbServer.createFeedStream(),
    pull.collect((err, msgs) => {
      const posts = msgs.map((x) => x.value.content);

      res.render("index", { posts, profile: ssbKeys });
    })
  );
});

app.post("/publish", (req, res) => {
  ssbServer.publish({ type: "post", text: req.body.message }, (err, msg) => {
    res.redirect("/");
  });
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = expressServer;
