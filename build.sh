#!/bin/bash
set -e

echo "================================"
echo "Installing Node dependencies..."
echo "================================"
npm ci

echo ""
echo "================================"
echo "Removing conflicting packages..."
echo "================================"
apt-get update
apt-get remove -y openssl libssl3 libssl-dev || true
apt-get autoremove -y

echo ""
echo "================================"
echo "Installing OpenSSL 1.1..."
echo "================================"
# Add OpenSSL 1.1 repository for Debian/Ubuntu
apt-get install -y wget curl gnupg
echo "deb http://security.debian.org/debian-security bullseye-security main contrib non-free" | tee /etc/apt/sources.list.d/bullseye-security.list
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys DCC9EFBF77E11517 || true
apt-get update
apt-get install -y libssl1.1 openssl=1.1.1* libxml2-utils ca-certificates

echo ""
echo "================================"
echo "Verifying installations..."
echo "================================"
which xmllint && xmllint --version && echo "✅ xmllint OK" || (echo "❌ xmllint FAILED" && exit 1)
which openssl && openssl version && echo "✅ openssl OK" || (echo "❌ openssl FAILED" && exit 1)

echo ""
echo "================================"
echo "Build complete!"
echo "================================"

