./node_modules/.bin/esbuild src/butler.js --bundle --outfile=build.cjs --format=cjs --platform=node --target=node23 --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url
node --experimental-sea-config sea-config.json
cp $(command -v node) butler
codesign --remove-signature butler
npx postject butler NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA
codesign --sign - butler
