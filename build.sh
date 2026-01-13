#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Installing system dependencies (xmllint, openssl)..."
apt-get update -qq
apt-get install -y libxml2-utils openssl

# Verify installation
which xmllint && echo "✅ xmllint installed" || echo "❌ xmllint not found"
which openssl && echo "✅ openssl installed" || echo "❌ openssl not found"

echo "Build complete!"
