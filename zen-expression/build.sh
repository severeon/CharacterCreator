#!/bin/bash
set -e
cd "$(dirname "$0")"
wasm-pack build --target web --out-dir ../zen-expression/pkg
