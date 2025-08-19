#!/bin/bash

# Build and install appshot locally
# Usage: /build

set -e  # Exit on error

echo "🔨 Building appshot..."

# Clean previous builds
echo "Cleaning previous build artifacts..."
rm -rf dist/

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✓ Dependencies already installed"
fi

# Run the build
echo "🏗️ Compiling TypeScript..."
npm run build

# Check if build succeeded
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not created"
    exit 1
fi

# Link the CLI globally for local testing
echo "🔗 Linking appshot globally..."
npm link

# Verify the installation
echo "✅ Build complete! Verifying installation..."
which appshot || echo "⚠️  Warning: appshot not found in PATH"

# Show the version to confirm it's working
echo ""
echo "📱 Appshot has been built and installed locally!"
echo "You can now use 'appshot' commands from anywhere."
echo ""
echo "Try: appshot --help"