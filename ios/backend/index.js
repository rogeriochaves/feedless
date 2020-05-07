console.log("Loading nodejs");

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

require("./lib/ssb");

require("./lib/express");
