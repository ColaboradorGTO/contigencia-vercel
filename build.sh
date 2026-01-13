#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Installing xmllint..."
apt-get update -qq
apt-get install -y libxml2-utils > /dev/null 2>&1

echo "Build complete!"
