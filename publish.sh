#!/bin/sh

set -ex

uglify() {
    for arg in "$@"; do
        npx terser ./min/out/$arg -o ./lib/$arg
    done
}

copy_declaration() {
    for arg in "$@"; do
        cp ./min/out/$arg ./lib
    done
}

npx minify-ts -o ./src ./min/src index.ts cli.ts
cp tsconfig.json ./min && npx tsc -p ./min
mkdir -p lib
copy_declaration index.d.ts
uglify index.js
(echo '#!/usr/bin/env node' && npx terser ./min/out/cli.js) > lib/cli.js
