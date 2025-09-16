#!/bin/bash

# Appshot Export Command for Claude Code
# Exports screenshots for Fastlane upload to App Store Connect

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Appshot Export - Prepare for Fastlane Upload${NC}"
echo ""

# Parse arguments
ARGS="$@"
DRY_RUN=""
GENERATE_CONFIG=""
COPY_FLAG=""
CLEAN_FLAG=""

# Check for flags in arguments
if [[ "$ARGS" == *"--dry-run"* ]]; then
    DRY_RUN="--dry-run"
    echo -e "${YELLOW}📋 Running in dry-run mode (preview only)${NC}"
fi

if [[ "$ARGS" == *"--generate-config"* ]]; then
    GENERATE_CONFIG="--generate-config"
    echo -e "${CYAN}⚙️  Will generate Fastlane configuration${NC}"
fi

if [[ "$ARGS" == *"--copy"* ]]; then
    COPY_FLAG="--copy"
    echo -e "${CYAN}📄 Will copy files instead of symlinks${NC}"
fi

if [[ "$ARGS" == *"--clean"* ]]; then
    CLEAN_FLAG="--clean"
    echo -e "${YELLOW}🧹 Will clean output directory first${NC}"
fi

# Check if final directory exists
if [ ! -d "final" ]; then
    echo -e "${RED}❌ No screenshots found in 'final/' directory${NC}"
    echo -e "${YELLOW}💡 Run 'appshot build' first to generate screenshots${NC}"
    exit 1
fi

# Count screenshots
SCREENSHOT_COUNT=$(find final -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" 2>/dev/null | wc -l | tr -d ' ')

if [ "$SCREENSHOT_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No screenshots found in final/ directory${NC}"
    echo -e "${YELLOW}💡 Run 'appshot build' to generate screenshots${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found $SCREENSHOT_COUNT screenshot(s) to export${NC}"
echo ""

# Run the export command
echo -e "${CYAN}📦 Exporting screenshots...${NC}"
appshot export $ARGS

# Check if export was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Export completed successfully!${NC}"

    # Show next steps if not dry-run
    if [ -z "$DRY_RUN" ]; then
        echo ""
        echo -e "${CYAN}📱 Next Steps:${NC}"
        echo "1. Configure Fastlane (if not done):"
        echo "   cd fastlane"
        echo "   Edit Deliverfile with your App Store Connect credentials"
        echo ""
        echo "2. Upload to App Store Connect:"
        echo "   fastlane deliver --skip_metadata --skip_app_version_update"
        echo ""
        echo "3. For future updates:"
        echo "   appshot build --preset iphone-6-9,ipad-13"
        echo "   /export --clean"
        echo "   cd fastlane && fastlane deliver"
    fi
else
    echo -e "${RED}❌ Export failed${NC}"
    exit 1
fi