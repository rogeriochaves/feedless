#!/bin/bash

if [ -f ~/.nvm/nvm.sh ]; then source ~/.nvm/nvm.sh; fi

set -e

node -v
npm -v

# export PLATFORM_NAME="iphoneos"
echo "PLATFORM_NAME: $PLATFORM_NAME"

# npm install --ignore-scripts

# PATCH_SCRIPT_DIR="$( cd node_modules/nodejs-mobile-react-native/scripts/ && pwd )"
# NODEJS_PROJECT_MODULES_DIR="$( cd node_modules/ && pwd )"
# node "$PATCH_SCRIPT_DIR"/patch-package.js $NODEJS_PROJECT_MODULES_DIR

# export GYP_DEFINES="OS=ios"
# export npm_config_platform="ios"
# export npm_config_format="make-ios"
# export npm_config_nodedir="$( cd node_modules/nodejs-mobile-react-native/ios/libnode && pwd )"
# export npm_config_node_gyp="$( cd node_modules/nodejs-mobile-gyp && pwd )/bin/node-gyp.js"
# export npm_config_node_engine="chakracore"
# export npm_config_arch="arm64"
# # export npm_config_print_arch="true"
# # export CC=/usr/local/Cellar/gcc/9.2.0_3/bin/gcc-9
# # export CS
# # export CXX=/usr/local/Cellar/gcc/9.2.0_3/bin/x86_64-apple-darwin19-g++-9

# npm --verbose rebuild --build-from-source
# npm install

echo "PROJECT_DIR: $PROJECT_DIR"
ls $PROJECT_DIR
echo ""

echo "CODESIGNING_FOLDER_PATH: $CODESIGNING_FOLDER_PATH"
ls $CODESIGNING_FOLDER_PATH
echo ""

# Remove some files we know that won't be used at all
rm -rf $CODESIGNING_FOLDER_PATH/backend/node_modules/sodium-native-nodejs-mobile/libsodium/android-toolchain*
rm -rf $CODESIGNING_FOLDER_PATH/backend/node_modules/leveldown

# Delete object files that may already come from within the npm package.
find "$CODESIGNING_FOLDER_PATH/backend/" -name "*.o" -type f -delete
find "$CODESIGNING_FOLDER_PATH/backend/" -name "*.a" -type f -delete
find "$CODESIGNING_FOLDER_PATH/backend/" -name "*.node" -type f -delete
# Delete bundle contents that may be there from previous builds.
find "$CODESIGNING_FOLDER_PATH/backend/" -path "*/*.node/*" -delete
find "$CODESIGNING_FOLDER_PATH/backend/" -name "*.node" -type d -delete
find "$CODESIGNING_FOLDER_PATH/backend/" -path "*/*.framework/*" -delete
find "$CODESIGNING_FOLDER_PATH/backend/" -name "*.framework" -type d -delete
# Apply patches to the modules package.json
if [ -d "$CODESIGNING_FOLDER_PATH"/backend/node_modules/ ]; then
  PATCH_SCRIPT_DIR="$( cd "$PROJECT_DIR" && cd build-nodejs-modules/node_modules/nodejs-mobile-react-native/scripts/ && pwd )"
  NODEJS_PROJECT_MODULES_DIR="$( cd "$CODESIGNING_FOLDER_PATH" && cd backend/node_modules/ && pwd )"
  echo "Applying patch $PATCH_SCRIPT_DIR/patch-package.js to $NODEJS_PROJECT_MODULES_DIR"
  node "$PATCH_SCRIPT_DIR"/patch-package.js $NODEJS_PROJECT_MODULES_DIR
fi
# Get the nodejs-mobile-gyp location
if [ -d "$PROJECT_DIR/build-nodejs-modules/node_modules/nodejs-mobile-gyp/" ]; then
  NODEJS_MOBILE_GYP_DIR="$( cd "$PROJECT_DIR" && cd build-nodejs-modules/node_modules/nodejs-mobile-gyp/ && pwd )"
else
  NODEJS_MOBILE_GYP_DIR="$( cd "$PROJECT_DIR" && cd build-nodejs-modules/node_modules/nodejs-mobile-react-native/node_modules/nodejs-mobile-gyp/ && pwd )"
fi
NODEJS_MOBILE_GYP_BIN_FILE="$NODEJS_MOBILE_GYP_DIR"/bin/node-gyp.js
# Rebuild modules with right environment
NODEJS_HEADERS_DIR="$( cd "$PROJECT_DIR" && cd build-nodejs-modules/node_modules/nodejs-mobile-react-native/ios/libnode/ && pwd )"
pushd $CODESIGNING_FOLDER_PATH/backend/
if [ "$PLATFORM_NAME" == "iphoneos" ]
then
  GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_node_gyp="$NODEJS_MOBILE_GYP_BIN_FILE" npm_config_platform="ios" npm_config_format="make-ios" npm_config_node_engine="chakracore" npm_config_arch="arm64" npm rebuild --build-from-source
else # iphonesimulator
  PLATFORM_NAME="iphoneos" GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_node_gyp="$NODEJS_MOBILE_GYP_BIN_FILE" npm_config_platform="ios" npm_config_format="make-ios" npm_config_node_engine="chakracore" npm_config_arch="x64" npm rebuild --build-from-source
fi
popd
