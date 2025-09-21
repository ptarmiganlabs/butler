# Build butler executable using Node.js SEA
# Execute this script from the repository's root folder

# Create a single JS file using esbuild
./node_modules/.bin/esbuild ./src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node23 --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url

# Generate blob to be injected into the binary
node --experimental-sea-config ./build-script/sea-config.json

# Get a copy of the Node executable
cp $(command -v node) ./build/butler

# Remove the signature from the Node executable
codesign --remove-signature ./build/butler

# Inject the blob
npx postject ./build/butler NODE_SEA_BLOB ./build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA

# Sign the binary
codesign --sign - ./build/butler

