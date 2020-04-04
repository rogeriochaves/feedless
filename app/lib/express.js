const express = require("express");
const app = express();
const port = 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", (_req, res) => {
  res.render("index", { message: "Hello there21!" });
});

app.post("/publish", (req, res) => {
  console.log("req.body", req.body);
  res.redirect("/");
});

const server = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

module.exports = server;
