# AppShot Commands for Claude Code

These commands help AI agents (like Claude Code) work more effectively with AppShot by providing comprehensive, inline documentation and examples.

## What Are These Commands?

These are slash commands that give AI coding assistants instant access to complete AppShot knowledge without needing to search documentation or run help commands. Each command is self-contained with all necessary information.

## Available Commands

| Command | Description | Example Usage |
|---------|-------------|---------------|
| `/appshot-init` | Initialize new AppShot project with device specifications | `/appshot-init iphone` |
| `/appshot-preset` | One-line preset commands for instant screenshots | `/appshot-preset bold` |
| `/appshot-style` | Complete styling reference with all gradients and fonts | `/appshot-style ocean` |
| `/appshot-caption` | Manage captions and translations | `/appshot-caption iphone` |
| `/appshot-build` | Build screenshots with troubleshooting | `/appshot-build iphone,ipad en,es,fr` |
| `/appshot-config` | Complete configuration reference | `/appshot-config` |
| `/appshot-quick` | Quick reference for common tasks | `/appshot-quick` |

## Installation

### Option 1: Quick Install (Recommended)
```bash
# Run the install script from the appshot directory
./commands/install.sh

# Or if you installed via npm
./node_modules/appshot-cli/commands/install.sh
```

### Option 2: Manual Installation - User Level (All Projects)
```bash
# Create Claude commands directory if it doesn't exist
mkdir -p ~/.claude/commands

# Link all AppShot commands
ln -sf "$(pwd)/commands"/*.md ~/.claude/commands/

# Or copy them if you prefer (won't auto-update)
cp commands/*.md ~/.claude/commands/
```

### Option 3: Project-Specific Installation
```bash
# For current project only
mkdir -p .claude/commands
cp node_modules/appshot-cli/commands/*.md .claude/commands/
```

---

## 🎬 Complete App Store Screenshot Workflow

This demonstrates how to use AppShot's Claude Code commands to generate professional App Store screenshots from scratch.

### Real Example: Meditation App Launch

```
User: Create App Store screenshots for my meditation app "MindfulMoments" 
      with a calming theme in English, Spanish, and French.

Claude: I'll help you create beautiful App Store screenshots for MindfulMoments. 
        Let me walk you through the complete process.

User: /appshot-init MindfulMoments

Claude: I've initialized the MindfulMoments project with the AppShot structure.
        Now let's apply a calming gradient theme.

User: /appshot-style ocean iphone

Claude: Perfect! I've applied the ocean gradient (blue to cyan) which gives
        a calming, peaceful feeling perfect for a meditation app.

User: /appshot-caption iphone

Claude: Let me help you add captions. For a meditation app, I suggest:
        - home.png: "Find Your Peace"
        - meditation.png: "Guided Sessions"
        - tracking.png: "Track Your Journey"
        - sounds.png: "Soothing Sounds"
        - community.png: "Mindful Together"
        
        I'll run the caption command for you to add these interactively.

User: Now translate these to Spanish and French.

Claude: I'll translate your captions to Spanish and French:
        appshot localize --langs es,fr --model gpt-4o-mini

User: /appshot-build iphone,ipad en,es,fr

Claude: Building all screenshots for iPhone and iPad in English, Spanish, and French:
        appshot build --devices iphone,ipad --langs en,es,fr

User: /appshot-quick

Claude: Here's the validation command to check App Store compliance:
        appshot validate

✅ Your screenshots are ready in the final/ directory!
```

---

## 📱 Real-World Examples

### E-Commerce App
```
User: /appshot-init ShopSmart

Claude: Setting up ShopSmart project structure with all device configurations.

User: /appshot-style gradient iphone

Claude: Applying default gradient. For an e-commerce app, consider these captions:
        - browse.png: "Discover Amazing Deals"
        - cart.png: "Easy Checkout"
        - tracking.png: "Track Your Orders"
        - wishlist.png: "Save Your Favorites"
        - profile.png: "Personalized for You"
```

### Fitness App
```
User: /appshot-init FitTracker

User: /appshot-style fire iphone

Claude: The fire gradient (red to orange) is perfect for a high-energy fitness app!
        Suggested captions:
        - dashboard.png: "Your Fitness Journey"
        - workout.png: "Custom Workouts"
        - nutrition.png: "Track Nutrition"
        - progress.png: "See Your Progress"
        - social.png: "Connect with Friends"
```

### Educational App
```
User: /appshot-init LearnPro

User: /appshot-style pastel iphone

Claude: Soft pastel gradients work great for educational apps. 
        Let me help with captions:
        - lessons.png: "Interactive Lessons"
        - quizzes.png: "Test Your Knowledge"
        - progress.png: "Track Learning"
        - achievements.png: "Earn Rewards"
        - community.png: "Learn Together"
```

---

## 🚀 Advanced Workflows

### Quick Style Changes
```
User: /appshot-style

Claude: Here are all 24 gradient presets available. To A/B test different styles,
you can quickly switch between them:

# Test ocean theme
appshot gradients --apply ocean
appshot build --devices iphone --langs en

# Test sunset theme  
appshot gradients --apply sunset
appshot build --devices iphone --langs en
```

### Bulk Configuration Updates
```
User: /appshot-config

Claude: I'll help you adjust the caption positioning. Here's how to ensure 
consistent caption height across all devices by editing .appshot/config.json:

{
  "devices": {
    "iphone": {
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320
      }
    }
  }
}
```

### CI/CD Integration
```
User: /appshot-quick

Claude: Here's a complete CI/CD script using only non-interactive commands:

#!/bin/bash
# ci-screenshots.sh
appshot init --force
appshot gradients --apply ocean
appshot fonts --set "Montserrat Bold"
appshot build --devices iphone,ipad --langs en,es,fr,de,it,ja
appshot validate
```

---

## 🎯 Pro Tips

### 1. Quick Reference Always Available
```
User: I forgot the exact command syntax.

Claude: /appshot-quick
[Instant access to all commands with examples]
```

### 2. Troubleshooting Built-In
```
User: My captions are getting cut off.

Claude: /appshot-build
[Contains troubleshooting section]

# Solution: Increase caption box height
"captionBox": {
  "autoSize": false,
  "minHeight": 400,
  "maxHeight": 400
}
```

### 3. Style Exploration
```
User: Show me all available fonts.

Claude: /appshot-style
[Lists all 50+ fonts with categories]

# Try different fonts
appshot fonts --set "Poppins Bold"
appshot fonts --set "Inter"
appshot fonts --set "SF Pro Display"
```

### 4. Multi-Language Best Practices
```
User: What's the most efficient way to handle 10+ languages?

Claude: /appshot-caption
[Shows batch translation workflow]

# Add English captions first
appshot caption --device iphone

# Then batch translate
appshot localize --langs es,fr,de,it,pt,ja,ko,zh-CN,ru,ar
```

---

## 💡 Creative Workflows

### Seasonal Campaigns
```
# Winter theme
User: /appshot-style arctic iphone
Claude: Applied arctic gradient (icy blue to purple) - perfect for winter!

# Summer theme
User: /appshot-style sunset iphone
Claude: Applied sunset gradient (orange to yellow) - great for summer vibes!

# Back to school
User: /appshot-style pastel iphone
Claude: Applied soft pastel gradient - ideal for educational content!
```

### A/B Testing
```
# Version A - Bold and vibrant
User: /appshot-style fire iphone
Claude: Setting up Version A with fire gradient and bold fonts:
        appshot fonts --set "Montserrat Bold"
        appshot build --output ./final-versionA

# Version B - Clean and minimal
User: /appshot-style grayscale iphone
Claude: Setting up Version B with grayscale and clean fonts:
        appshot fonts --set "Inter"
        appshot build --output ./final-versionB
```

### Brand Consistency
```
User: /appshot-config

Claude: To match your exact brand colors, update the config:
{
  "background": {
    "gradient": {
      "colors": ["#FF6B35", "#F72585"],
      "direction": "diagonal"
    }
  }
}
```

---

## 🔧 Debugging & Validation

### Check System Requirements
```
User: Is my system properly configured?

Claude: Let me check with /appshot-quick
        appshot doctor
```

### Validate Screenshots
```
User: Are my screenshots App Store compliant?

Claude: Using /appshot-quick for validation:
        appshot validate
```

### Preview Before Building
```
User: Can I preview without generating all screenshots?

Claude: Yes! Using /appshot-build options:
        appshot build --dry-run
```

---

## Benefits for AI Agents

1. **No Documentation Searching** - All information is inline in the command response
2. **Context-Aware** - Commands can accept arguments to provide specific guidance
3. **Copy-Paste Ready** - All JSON configs and bash commands work immediately
4. **Complete Examples** - Real-world configurations that can be used directly
5. **Troubleshooting Included** - Common issues and fixes are part of each command

## How Commands Work

When an AI agent uses a command like `/appshot-init iphone`, it receives:
- Complete device specifications and resolutions
- Ready-to-use JSON configurations
- Step-by-step instructions
- Common issues and solutions
- All non-interactive commands for automation

## 🚦 Quick Start Checklist

1. ✅ Install AppShot commands: `./commands/install.sh`
2. ✅ Initialize project: `/appshot-init [project-name]`
3. ✅ Apply styling: `/appshot-style [gradient] [device]`
4. ✅ Add captions: `/appshot-caption [device]`
5. ✅ Build screenshots: `/appshot-build [devices] [languages]`
6. ✅ Validate output: `appshot validate`

## Updating Commands

When AppShot is updated, re-run the install script to get the latest command definitions:
```bash
./commands/install.sh
```

## Uninstalling

To remove AppShot commands from Claude Code:
```bash
# Remove symlinks
rm ~/.claude/commands/appshot-*.md

# Or if you copied them
rm ~/.claude/commands/appshot-*.md
```

## For Developers

These commands are designed to be comprehensive references. When updating:
1. Include ALL necessary information inline
2. Provide working JSON examples
3. List exact values (hex colors, resolutions, etc.)
4. Include troubleshooting sections
5. Focus on non-interactive commands for automation

## Need Help?

- **Quick reference**: `/appshot-quick`
- **Configuration help**: `/appshot-config`
- **Troubleshooting**: `/appshot-build` (includes common issues)
- **All options**: Each command contains complete documentation inline

Remember: Every command is self-contained with all the information needed to complete the task!

## Support

For issues with the commands or suggestions for improvements, please open an issue at:
https://github.com/chrisvanbuskirk/appshot