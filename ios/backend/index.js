console.log("Loading nodejs");

process.on("unhandledRejection", (reason, _promise) => {
  console.log("unhandledRejection", reason);
});
process.on("uncaughtException", (err) => {
  console.log("uncaughtException", err);
});

require("./lib/ssb");

setTimeout(() => {
  require("./lib/express");
}, 1000);
