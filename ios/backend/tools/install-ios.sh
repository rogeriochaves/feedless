#!/bin/bash

if [ -f node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node ]; then
  echo "Native bindings already built, skipping"
  exit 0
fi

set -e

# Logging those to help with debugging
node -v
npm -v
echo "PLATFORM_NAME: $PLATFORM_NAME"
echo "current path: $( pwd )"

cd ../build-nodejs-modules
npm install
cd ../backend

npm install --no-optional --ignore-scripts

# Remove some files we know that won't be used at all
rm -rf node_modules/sodium-native-nodejs-mobile/libsodium/android-toolchain*
rm -rf node_modules/leveldown

export npm_config_node_gyp="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-gyp/ && pwd )/bin/node-gyp.js"
export npm_config_nodedir="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-react-native/ios/libnode/ && pwd )"
export npm_config_platform="ios"
export GYP_DEFINES="OS=ios"
export npm_config_format="make-ios"
export npm_config_node_engine="chakracore" # nodejs-mobile uses chakracore

# Rebuild modules with right environment
if [ "$PLATFORM_NAME" == "iphoneos" ]; then
  npm_config_arch="arm64" npm rebuild --build-from-source
  mv node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node.folder
  mv node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node.folder/sodium node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node
  codesign -f -s "Apple Development: Rogerio Fernandes Junior" node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node
else # iphonesimulator
  PLATFORM_NAME="iphoneos" npm_config_arch="x64" npm rebuild --build-from-source
fi

# We dont need libsodium source files anymore
rm -rf node_modules/sodium-native-nodejs-mobile/libsodium
rm -rf node_modules/sodium-native-nodejs-mobile/build/Release/obj.target