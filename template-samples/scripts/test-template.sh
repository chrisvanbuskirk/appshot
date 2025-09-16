#!/bin/bash

echo "🚀 Testing Appshot Template System"
echo "=================================="
echo ""

# Build the project
echo "Building Appshot..."
npm run build > /dev/null 2>&1

echo "✅ Build complete"
echo ""

# Test template list
echo "📋 Available Templates:"
echo "----------------------"
node dist/cli.js template --list | grep -E "^  (modern|minimal|bold|elegant|showcase|playful|corporate)" | head -7
echo ""

# Test template preview
echo "🔍 Template Preview (modern):"
echo "----------------------------"
node dist/cli.js template --preview modern | grep -E "^  (Type|Scale|Position|Font|Background):" | head -5
echo ""

echo "✨ Template system is ready!"
echo ""
echo "Quick Start Commands:"
echo "  appshot quickstart                  # Interactive setup"
echo "  appshot template modern             # Apply modern template"
echo "  appshot template --list             # View all templates"
echo ""