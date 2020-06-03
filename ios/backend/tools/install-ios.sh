#!/bin/bash

if [ "$PLATFORM_NAME" == "iphoneos" ]; then
  OTHER_PLATFORM="iphonesimulator"
else
  OTHER_PLATFORM="iphoneos"
fi

if grep "$PLATFORM_NAME" NATIVE_BUILD.txt; then
  echo "Native bindings already built, skipping"
  exit 0
elif [ -d node_modules.$PLATFORM_NAME ]; then
  mv node_modules node_modules.$OTHER_PLATFORM || 1
  mv node_modules.$PLATFORM_NAME node_modules
  echo "$PLATFORM_NAME" > "NATIVE_BUILD.txt"

  npm install --no-optional --ignore-scripts

  echo "Found existing bindings, skipping"
  exit 0
fi

if [ -f NATIVE_BUILD.txt ]; then
  echo "Found exiting build but for $OTHER_PLATFORM, building again for $PLATFORM_NAME"
  mv node_modules node_modules.$OTHER_PLATFORM
  rm NATIVE_BUILD.txt
fi

# Logging those to help with debugging
node -v
npm -v
echo "PLATFORM_NAME: $PLATFORM_NAME"
echo "current path: $( pwd )"

npm install --no-optional --ignore-scripts

set -e

cd ../build-nodejs-modules
npm install
cd ../backend

export npm_config_node_gyp="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-gyp/ && pwd )/bin/node-gyp.js"
export npm_config_nodedir="$( cd ../build-nodejs-modules/node_modules/nodejs-mobile-react-native/ios/libnode/ && pwd )"
export npm_config_platform="ios"
export GYP_DEFINES="OS=ios"
export npm_config_format="make-ios"
export npm_config_node_engine="chakracore" # nodejs-mobile uses chakracore

# Rebuild modules with right environment
if [ "$PLATFORM_NAME" == "iphoneos" ]; then
  npm_config_arch="arm64" npm rebuild --build-from-source
else # iphonesimulator
  cp node_modules/sodium-native-nodejs-mobile/libsodium/dist-build/ios.sh node_modules/sodium-native-nodejs-mobile/patches/ios.sh
  PLATFORM_NAME="iphoneos" npm_config_arch="x64" npm rebuild --build-from-source
fi

function mv_and_sign {
  mv $1 $1.folder
  mv $1.folder/$2 $1
  codesign -f -s "Apple Development: Rogerio Chaves Fernandes Junior" $1
}

mv_and_sign "node_modules/sodium-native-nodejs-mobile/build/Release/sodium.node" "sodium"
mv_and_sign "node_modules/leveldown-nodejs-mobile/build/Release/leveldown.node" "leveldown"

echo "$PLATFORM_NAME" > "NATIVE_BUILD.txt"