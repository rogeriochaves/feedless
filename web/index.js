let server;
require("./lib/ssb");

setTimeout(() => {
  server = require("./lib/express");
}, 500);

let mode = process.env.MODE || "standalone";
if (mode == "standalone") {
  setTimeout(() => {
    require("./lib/electron");
  }, 1000);
}

if (mode == "server" && process.env.NODE_ENV != "production") {
  const chokidar = require("chokidar");
  const watcher = chokidar.watch("./lib");

  watcher.on("ready", () => {
    watcher.on("all", () => {
      console.log("Clearing /lib/ module cache from server");
      Object.keys(require.cache).forEach((id) => {
        if (id.includes("metrics")) return;
        if (/[\/\\]lib[\/\\]/.test(id)) delete require.cache[id];
      });
      if (server && server.close) server.close();
      server = require("./lib/express");
    });
  });
}

process.on("unhandledRejection", (reason, _promise) => {
  console.error("unhandledRejection", reason);
  setTimeout(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
  setTimeout(() => {
    process.exit(1);
  });
});
