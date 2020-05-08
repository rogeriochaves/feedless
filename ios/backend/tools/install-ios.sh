#!/bin/bash

if [ -f node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node ]; then
  echo "Native bindings already built, skipping"
  exit 0
fi

set -e

node -v
npm -v

# export PLATFORM_NAME="iphoneos"
echo "PLATFORM_NAME: $PLATFORM_NAME"
echo "current path: $( pwd )"

npm install --no-optional --ignore-scripts

# Remove some files we know that won't be used at all
rm -rf node_modules/sodium-native-nodejs-mobile/libsodium/android-toolchain*
rm -rf node_modules/leveldown

# Delete object files that may already come from within the npm package.
find . -name "*.o" -type f -delete
find . -name "*.a" -type f -delete
find . -name "*.node" -type f -delete
# Delete bundle contents that may be there from previous builds.
find . -path "*/*.node/*" -delete
find . -name "*.node" -type d -delete
find . -path "*/*.framework/*" -delete
find . -name "*.framework" -type d -delete
# Apply patches to the modules package.json
if [ -d node_modules/ ]; then
  PATCH_SCRIPT_DIR="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-react-native/scripts/ && pwd )"
  NODEJS_PROJECT_MODULES_DIR="$( cd node_modules/ && pwd )"
  echo "Applying patch $PATCH_SCRIPT_DIR/patch-package.js to $NODEJS_PROJECT_MODULES_DIR"
  node "$PATCH_SCRIPT_DIR"/patch-package.js $NODEJS_PROJECT_MODULES_DIR
fi
# Get the nodejs-mobile-gyp location
if [ -d "../build-nodejs-modules/node_modules/nodejs-mobile-gyp/" ]; then
  NODEJS_MOBILE_GYP_DIR="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-gyp/ && pwd )"
else
  NODEJS_MOBILE_GYP_DIR="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-react-native/node_modules/nodejs-mobile-gyp/ && pwd )"
fi
NODEJS_MOBILE_GYP_BIN_FILE="$NODEJS_MOBILE_GYP_DIR"/bin/node-gyp.js

# Rebuild modules with right environment
NODEJS_HEADERS_DIR="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-react-native/ios/libnode/ && pwd )"
if [ "$PLATFORM_NAME" == "iphoneos" ]
then
  GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_node_gyp="$NODEJS_MOBILE_GYP_BIN_FILE" npm_config_platform="ios" npm_config_format="make-ios" npm_config_node_engine="chakracore" npm_config_arch="arm64" npm rebuild --build-from-source
  mv node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node.folder
  mv node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node.folder/sodium node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node
  codesign -f -s "Apple Development: Rogerio Fernandes Junior" node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node
else # iphonesimulator
  PLATFORM_NAME="iphoneos" GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_node_gyp="$NODEJS_MOBILE_GYP_BIN_FILE" npm_config_platform="ios" npm_config_format="make-ios" npm_config_node_engine="chakracore" npm_config_arch="x64" npm rebuild --build-from-source
fi
