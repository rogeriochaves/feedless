#!/bin/bash

echo "Embeding frameworks"

# Embed every resulting .framework in the application
embed_framework() {
  FRAMEWORK_NAME="$(basename "$1")"
  cp -r "$1" "$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH/"
  /usr/bin/codesign --force --sign $EXPANDED_CODE_SIGN_IDENTITY --preserve-metadata=identifier,entitlements,flags --timestamp=none "$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH/$FRAMEWORK_NAME"
}

find . -name "*.framework" -type d | while read frmwrk_path; do embed_framework "$frmwrk_path"; done