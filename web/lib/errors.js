const Sentry = require("@sentry/node");

let sentry;
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN && process.env.NODE_ENV == "production") {
  Sentry.init({
    dsn: SENTRY_DSN,
  });
  sentry = Sentry;
}

process.on("unhandledRejection", (reason, _promise) => {
  console.error("unhandledRejection", reason);
  if (sentry) {
    Sentry.captureException(new Error(reason.toString()));
  }
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
  if (sentry) {
    Sentry.captureException(err);
  }
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

module.exports.sentry = sentry;
