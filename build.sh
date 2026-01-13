#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Updating package manager..."
apt-get update

echo "Removing OpenSSL 3.0 to avoid conflicts..."
apt-get remove -y openssl || true

echo "Installing system dependencies: libxml2-utils and OpenSSL 1.1..."
apt-get install -y libxml2-utils openssl=1.1.1* ca-certificates

echo "Setting OpenSSL 1.1 as default..."
update-alternatives --install /usr/bin/openssl openssl /usr/bin/openssl 1

# Verify installation
echo ""
echo "Verifying installations..."
which xmllint && echo "✅ xmllint installed successfully" || (echo "❌ xmllint not found" && exit 1)
which openssl && echo "✅ openssl installed successfully" || (echo "❌ openssl not found" && exit 1)
xmllint --version
openssl version

echo ""
echo "Build complete!"

