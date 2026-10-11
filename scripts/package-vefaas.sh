#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/release"
NODE_VERSION="${NODE_VERSION:-20.20.0}"
NODE_ARCHIVE="node-v${NODE_VERSION}-linux-x64.tar.xz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}"
BUILD_ID="$(date -u +%Y%m%dT%H%M%SZ)"
BASE_BUILD_ID="$BUILD_ID"
RELEASE_DIR="$OUT/$BUILD_ID"
BUILD_SEQUENCE=1
while [[ -e "$RELEASE_DIR" ]]; do
  BUILD_SEQUENCE=$((BUILD_SEQUENCE + 1))
  BUILD_ID="${BASE_BUILD_ID}-${BUILD_SEQUENCE}"
  RELEASE_DIR="$OUT/$BUILD_ID"
done
STAGING="$RELEASE_DIR/.server-linux"
RUNTIME_CACHE="$OUT/.runtime-cache"

mkdir -p "$STAGING"
mkdir -p "$RUNTIME_CACHE"

cd "$ROOT"
npm run build

cp server/package.json server/package-lock.json "$STAGING/"
npm ci --omit=dev --prefix "$STAGING"
# Build happens on macOS while veFaaS is Linux. Force sharp's matching Linux
# optional packages into the deployment bundle so the runtime can load it.
npm install --force --no-save --prefix "$STAGING" \
  @img/sharp-linux-x64@0.33.5 \
  @img/sharp-libvips-linux-x64@1.0.4
cp server/shared.mjs "$STAGING/"
cp -R server/web server/generator "$STAGING/"

mkdir -p "$RELEASE_DIR/web"
cp -R dist "$RELEASE_DIR/web/"
mkdir -p "$RELEASE_DIR/web/server"
cp "$STAGING/shared.mjs" "$RELEASE_DIR/web/server/"
cp -R "$STAGING/web" "$RELEASE_DIR/web/server/"
cp -R "$STAGING/node_modules" "$RELEASE_DIR/web/server/"
cat > "$RELEASE_DIR/web/run.sh" <<'RUN'
#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
exec node server/web/index.mjs
RUN
chmod +x "$RELEASE_DIR/web/run.sh"

mkdir -p "$RELEASE_DIR/generator"
cp "$STAGING/shared.mjs" "$RELEASE_DIR/generator/"
cp -R "$STAGING/generator" "$RELEASE_DIR/generator/"
cp -R "$STAGING/node_modules" "$RELEASE_DIR/generator/"
if [[ ! -f "$RUNTIME_CACHE/$NODE_ARCHIVE" ]]; then
  curl --fail --location --silent --show-error "$NODE_URL" --output "$RUNTIME_CACHE/$NODE_ARCHIVE"
fi
tar -xJf "$RUNTIME_CACHE/$NODE_ARCHIVE" -C "$RELEASE_DIR/generator"
mv "$RELEASE_DIR/generator/node-v${NODE_VERSION}-linux-x64" "$RELEASE_DIR/generator/runtime"
cat > "$RELEASE_DIR/generator/run.sh" <<'RUN'
#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
exec ./runtime/bin/node generator/bootstrap.mjs "$@"
RUN
chmod +x "$RELEASE_DIR/generator/run.sh"

(
  cd "$RELEASE_DIR/web"
  zip -qr "../gift-maker-web-test-$BUILD_ID.zip" .
)
(
  cd "$RELEASE_DIR/generator"
  zip -qr "../gift-maker-generate-test-$BUILD_ID.zip" .
)

cat > "$RELEASE_DIR/manifest.json" <<EOF
{
  "buildId": "$BUILD_ID",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "webPackage": "gift-maker-web-test-$BUILD_ID.zip",
  "generatorPackage": "gift-maker-generate-test-$BUILD_ID.zip"
}
EOF

echo "Created:"
echo "  $RELEASE_DIR/gift-maker-web-test-$BUILD_ID.zip"
echo "  $RELEASE_DIR/gift-maker-generate-test-$BUILD_ID.zip"
