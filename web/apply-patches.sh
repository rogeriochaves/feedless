sed -i -e 's/console/\/\/console/g' node_modules/compare-at-paths/index.js
sed -i -e 's/console/\/\/console/g' node_modules/map-filter-reduce/index.js
sed -i -e 's/setupRPC, null/setupRPC, opts.onError/g' node_modules/secret-stack/core.js
sed -i -e 's/if(err.message in streamErrors)/if(true || err.message in streamErrors)/g' node_modules/ssb-replicate/legacy.js