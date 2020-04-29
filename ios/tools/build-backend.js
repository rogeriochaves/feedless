#!/usr/bin/env node
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const util = require("util");
const ora = require("ora");
const exec = util.promisify(require("child_process").exec);

const loading = ora("...").start();
const verbose = !!process.argv.includes("--verbose");

async function runAndReport(label, task) {
  const now = Date.now();
  try {
    loading.start(label);
    var { stdout, stderr } = await task;
  } catch (err) {
    loading.fail();
    if (verbose) {
      console.error(stderr);
    }
    console.error(err.stack);
    process.exit(err.code);
  }
  const duration = Date.now() - now;
  const durationLabel =
    duration < 1000
      ? duration + " milliseconds"
      : duration < 60000
      ? (duration * 0.001).toFixed(1) + " seconds"
      : ((duration * 0.001) / 60).toFixed(1) + " minutes";
  loading.succeed(`${label} (${durationLabel})`);
  if (verbose) {
    console.log(stdout);
  }
}

(async function () {
  if (process.env.NODE_ENV == "production") {
    await runAndReport(
      "Install backend node modules",
      exec("npm install --no-optional")
    );

    await runAndReport(
      "Remove unused files meant for macOS or Windows or Electron",
      exec("./tools/backend/remove-unused-files.sh")
    );
  }

  await runAndReport(
    "Bundle and minify backend JS into one file",
    exec("./tools/backend/noderify-mobile.sh")
  );
})();
