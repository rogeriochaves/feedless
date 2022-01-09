"use strict";
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_)
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
var __read =
  (this && this.__read) ||
  function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o),
      r,
      ar = [],
      e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
        ar.push(r.value);
    } catch (error) {
      e = { error: error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
var secret_stack_decorators_1 = require("secret-stack-decorators");
var path = require("path");
var run = require("promisify-tuple");
var Notify = require("pull-notify");
var pull = require("pull-stream");
var drainGently = require("pull-drain-gently");
var trammel = require("trammel");
var debug = require("debug")("ssb:blobs-purge");
function heuristic(blob) {
  var sizeInKb = blob.size * 9.7e-4;
  var ageInDays = (Date.now() - blob.ts) * 1.2e-8;
  return sizeInKb * ageInDays;
}
function bytesToMB(x) {
  return Math.round(x * 9.53e-7);
}
var DEFAULT_CPU_MAX = 50;
var DEFAULT_MAX_PAUSE = 15e3;
var DEFAULT_STORAGE_LIMIT = 10e9;
var blobsPurge = (function () {
  function blobsPurge(ssb, config) {
    var _this = this;
    this.isMyBlob = function (blobId, cb) {
      cb(null, false);
    };
    this.resume = function () {
      return __awaiter(_this, void 0, void 0, function () {
        var _a, e1, used, thresholds;
        var _this = this;
        var _b;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              this.notifier({ event: "resumed" });
              return [
                4,
                run(trammel)(this.blobsPath, {
                  type: "raw",
                }),
              ];
            case 1:
              (_a = __read.apply(void 0, [_c.sent(), 2])),
                (e1 = _a[0]),
                (used = _a[1]);
              if (e1) throw e1;
              if (used < this.storageLimit) {
                debug(
                  "Blobs directory already fits within our predetermined limit: %dMB < %dMB",
                  bytesToMB(used),
                  bytesToMB(this.storageLimit)
                );
                debug("Paused the purge task");
                this.notifier({ event: "paused" });
                this.scheduleNextResume();
                return [2];
              }
              thresholds = pull.values([1e7, 1e6, 1e5, 1e4, 1e3, 0]);
              (_b = this.task) === null || _b === void 0 ? void 0 : _b.abort();
              this.task = pull(
                thresholds,
                pull.map(function (threshold) {
                  return pull(
                    _this.ssb.blobs.ls({ meta: true }),
                    pull.filter(function (blob) {
                      return heuristic(blob) > threshold;
                    })
                  );
                }),
                pull.flatten(),
                pull.asyncMap(this.maybeDelete),
                drainGently(
                  { ceiling: this.cpuMax, wait: 60, maxPause: this.maxPause },
                  function (done) {
                    if (!done) return;
                    debug("Paused the purge task");
                    _this.notifier({ event: "paused" });
                    return false;
                  },
                  this.scheduleNextResume
                )
              );
              return [2];
          }
        });
      });
    };
    this.maybeDelete = function (blob, cb) {
      return __awaiter(_this, void 0, void 0, function () {
        var _a, e1, used, _b, e2, isMine, _c, e3;
        return __generator(this, function (_d) {
          switch (_d.label) {
            case 0:
              return [
                4,
                run(trammel)(this.blobsPath, {
                  type: "raw",
                }),
              ];
            case 1:
              (_a = __read.apply(void 0, [_d.sent(), 2])),
                (e1 = _a[0]),
                (used = _a[1]);
              if (e1) return [2, cb(e1)];
              if (!(used > this.storageLimit)) return [3, 4];
              return [4, run(this.isMyBlob)(blob.id)];
            case 2:
              (_b = __read.apply(void 0, [_d.sent(), 2])),
                (e2 = _b[0]),
                (isMine = _b[1]);
              if (e2) return [2, cb(e2)];
              if (isMine) return [2, cb(null, false)];
              debug(
                "Blobs directory occupies too much space: %dMB",
                bytesToMB(used)
              );
              debug(
                "Delete blob %s which weighs %dMB",
                blob.id,
                bytesToMB(blob.size)
              );
              return [4, run(this.ssb.blobs.rm)(blob.id)];
            case 3:
              (_c = __read.apply(void 0, [_d.sent(), 1])), (e3 = _c[0]);
              if (e3) return [2, cb(e3)];
              this.notifier({ event: "deleted", blobId: blob.id });
              cb(null, false);
              return [3, 5];
            case 4:
              debug(
                "Blobs directory now fits within our predetermined limit of %dMB",
                bytesToMB(this.storageLimit)
              );
              cb(null, true);
              _d.label = 5;
            case 5:
              return [2];
          }
        });
      });
    };
    this.scheduleNextResume = function () {
      var _a, _b;
      var count = 0;
      (_a = _this.task) === null || _a === void 0 ? void 0 : _a.abort();
      _this.task = pull(
        (_b = _this.ssb.blobs) === null || _b === void 0
          ? void 0
          : _b.changes(),
        pull.drain(function () {
          count += 1;
          if (count < 10) return;
          debug("Resuming the purge task because new blobs have been added");
          _this.resume();
          return false;
        })
      );
    };
    this.start = function (opts) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
      _this.storageLimit =
        (_c =
          (_b =
            (_a = _this.config.blobsPurge) === null || _a === void 0
              ? void 0
              : _a.storageLimit) !== null && _b !== void 0
            ? _b
            : opts === null || opts === void 0
            ? void 0
            : opts.storageLimit) !== null && _c !== void 0
          ? _c
          : DEFAULT_STORAGE_LIMIT;
      _this.cpuMax =
        (_f =
          (_e =
            (_d = _this.config.blobsPurge) === null || _d === void 0
              ? void 0
              : _d.cpuMax) !== null && _e !== void 0
            ? _e
            : opts === null || opts === void 0
            ? void 0
            : opts.cpuMax) !== null && _f !== void 0
          ? _f
          : DEFAULT_CPU_MAX;
      _this.maxPause =
        (_j =
          (_h =
            (_g = _this.config.blobsPurge) === null || _g === void 0
              ? void 0
              : _g.maxPause) !== null && _h !== void 0
            ? _h
            : opts === null || opts === void 0
            ? void 0
            : opts.maxPause) !== null && _j !== void 0
          ? _j
          : DEFAULT_MAX_PAUSE;
      (_k = _this.task) === null || _k === void 0 ? void 0 : _k.abort();
      _this.task = void 0;
      debug("Started the purge task ");
      _this.resume();
    };
    this.stop = function () {
      var _a;
      (_a = _this.task) === null || _a === void 0 ? void 0 : _a.abort();
      _this.task = void 0;
      debug("Stopped the purge task ");
    };
    this.changes = function () {
      return _this.notifier.listen();
    };
    this.ssb = ssb;
    this.config = config;
    this.blobsPath = path.join(config.path, "blobs");
    this.notifier = Notify();
    this.init();
  }
  blobsPurge.prototype.init = function () {
    var _a, _b, _c;
    if (
      !((_a = this.ssb.blobs) === null || _a === void 0 ? void 0 : _a.ls) ||
      !((_b = this.ssb.blobs) === null || _b === void 0 ? void 0 : _b.rm)
    ) {
      throw new Error(
        '"ssb-blobs-purge" is missing required plugin "ssb-blobs"'
      );
    }
  };
  __decorate(
    [secret_stack_decorators_1.muxrpc("sync")],
    blobsPurge.prototype,
    "start",
    void 0
  );
  __decorate(
    [secret_stack_decorators_1.muxrpc("sync")],
    blobsPurge.prototype,
    "stop",
    void 0
  );
  __decorate(
    [secret_stack_decorators_1.muxrpc("source")],
    blobsPurge.prototype,
    "changes",
    void 0
  );
  blobsPurge = __decorate(
    [secret_stack_decorators_1.plugin("1.0.0")],
    blobsPurge
  );
  return blobsPurge;
})();
module.exports = blobsPurge;
