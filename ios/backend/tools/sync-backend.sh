#!/bin/bash

rsync -avq --delete --exclude "node_modules*" "backend" "$CODESIGNING_FOLDER_PATH"
rsync -avq --delete --prune-empty-dirs --include="*/" --include="*.node" --exclude="*" "backend/node_modules" "$CODESIGNING_FOLDER_PATH/backend"
