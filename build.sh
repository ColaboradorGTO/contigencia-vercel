#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Updating package manager..."
apt-get update

echo "Installing system dependencies: libxml2-utils and openssl 1.1..."
# Install OpenSSL 1.1 (compatible with pem library)
apt-get install -y libxml2-utils openssl=1.1.1* ca-certificates

# Verify installation
echo ""
echo "Verifying installations..."
which xmllint && echo "✅ xmllint installed successfully" || (echo "❌ xmllint not found" && exit 1)
which openssl && echo "✅ openssl installed successfully" || (echo "❌ openssl not found" && exit 1)
xmllint --version
openssl version

echo ""
echo "Build complete!"

