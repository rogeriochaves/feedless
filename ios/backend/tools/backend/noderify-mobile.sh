#!/bin/bash

# Any copyright is dedicated to the Public Domain.
# http://creativecommons.org/publicdomain/zero/1.0/

set -eEu -o pipefail
shopt -s extdebug
IFS=$'\n\t'
trap 'onFailure $?' ERR

function onFailure() {
  echo "Unhandled script error $1 at ${BASH_SOURCE[0]}:${BASH_LINENO[0]}" >&2
  exit 1
}

# Why some packages are filter'd or replaced:
#   bindings: after noderify, the paths to .node files might be different, so
#      we use a special fork of bindings
#   chloride: needs special compilation configs for android, and we'd like to
#      remove unused packages such as sodium-browserify etc
#   leveldown: newer versions of leveldown are intentionally ignoring
#      nodejs-mobile support, so we run an older version
#   bl: we didn't use it, and bl@0.8.x has security vulnerabilities
#   bufferutil: because we want nodejs-mobile to load its native bindings
#   supports-color: optional dependency within package `debug`
#   utf-8-validate: because we want nodejs-mobile to load its native bindings
mkdir -p out/
$(npm bin)/noderify \
  --replace.bindings=bindings-noderify-nodejs-mobile \
  --replace.chloride=sodium-chloride-native-nodejs-mobile \
  --replace.leveldown=leveldown-nodejs-mobile \
  --replace.node-extend=xtend \
  --filter=bl \
  --filter=bufferutil \
  --filter=supports-color \
  --filter=utf-8-validate \
  index.js > out/index.js;