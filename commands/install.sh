#!/bin/bash

# AppShot Commands Installer for Claude Code
# This script installs AppShot slash commands for use in Claude Code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing AppShot commands for Claude Code...${NC}"
echo ""

# Create Claude commands directory if it doesn't exist
if [ ! -d "$HOME/.claude/commands" ]; then
    echo "Creating ~/.claude/commands directory..."
    mkdir -p "$HOME/.claude/commands"
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if script is being run from the correct location
if [ ! -f "$SCRIPT_DIR/appshot-quick.md" ]; then
    echo -e "${RED}Error: Command files not found in $SCRIPT_DIR${NC}"
    echo "Please run this script from the appshot/commands directory"
    exit 1
fi

# Track installation status
INSTALLED=0
SKIPPED=0
FAILED=0

# Install each command file
for file in "$SCRIPT_DIR"/appshot-*.md; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        target="$HOME/.claude/commands/$filename"
        
        # Check if file already exists
        if [ -L "$target" ] || [ -f "$target" ]; then
            # Check if it's already linked to our file
            if [ "$(readlink -f "$target" 2>/dev/null)" = "$(readlink -f "$file")" ]; then
                echo -e "  ${YELLOW}↻${NC} /$( basename "$file" .md) (already installed)"
                SKIPPED=$((SKIPPED + 1))
            else
                # Different file exists, ask user
                echo -e "${YELLOW}Warning: $target already exists${NC}"
                read -p "Overwrite? (y/N) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    rm -f "$target"
                    ln -sf "$file" "$target"
                    echo -e "  ${GREEN}✓${NC} /$( basename "$file" .md) (updated)"
                    INSTALLED=$((INSTALLED + 1))
                else
                    echo -e "  ${YELLOW}⊘${NC} /$( basename "$file" .md) (skipped)"
                    SKIPPED=$((SKIPPED + 1))
                fi
            fi
        else
            # Create symlink
            ln -sf "$file" "$target"
            echo -e "  ${GREEN}✓${NC} /$( basename "$file" .md)"
            INSTALLED=$((INSTALLED + 1))
        fi
    fi
done

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"

# Summary
if [ $INSTALLED -gt 0 ]; then
    echo -e "${GREEN}✅ AppShot commands installed successfully!${NC}"
    echo -e "   ${GREEN}$INSTALLED${NC} commands installed"
fi
if [ $SKIPPED -gt 0 ]; then
    echo -e "   ${YELLOW}$SKIPPED${NC} commands already up to date"
fi
if [ $FAILED -gt 0 ]; then
    echo -e "   ${RED}$FAILED${NC} commands failed to install"
fi

echo ""
echo -e "${BLUE}Available commands in Claude Code:${NC}"
echo -e "  ${GREEN}/appshot-quick${NC}   - Quick reference for common tasks"
echo -e "  ${GREEN}/appshot-init${NC}    - Initialize new project"
echo -e "  ${GREEN}/appshot-preset${NC}  - One-line preset commands for instant screenshots"
echo -e "  ${GREEN}/appshot-style${NC}   - Style screenshots with gradients/fonts"
echo -e "  ${GREEN}/appshot-caption${NC} - Manage captions and translations"
echo -e "  ${GREEN}/appshot-build${NC}   - Build screenshots with options"
echo -e "  ${GREEN}/appshot-export${NC}  - Export for Fastlane upload"
echo -e "  ${GREEN}/appshot-config${NC}  - Complete configuration reference"

echo ""
echo -e "${BLUE}Usage example:${NC}"
echo -e "  In Claude Code, type: ${GREEN}/appshot-quick${NC}"
echo -e "  This gives you instant access to all common commands"

echo ""
echo -e "${BLUE}To update commands in the future:${NC}"
echo -e "  Run: ${GREEN}./commands/install.sh${NC}"

echo ""
echo -e "${GREEN}Happy coding with AppShot! 🎨📱${NC}"