---
description: Manage captions with translations and multi-language support
allowed-tools: Bash, Edit, Write
---

# Manage AppShot Captions for $1

## Quick Caption Commands

### Add Captions Interactively
```bash
appshot caption --device iphone
# Use arrow keys, type to search suggestions, Tab to autocomplete
```

### Add Captions with AI Translation
```bash
# Translate while adding captions
appshot caption --device iphone --translate --langs es,fr,de

# Required: export OPENAI_API_KEY="sk-..."
```

### Batch Translate Existing Captions
```bash
# Translate all existing captions to multiple languages
appshot localize --langs es,fr,de,it,pt,ja,ko,zh-CN --model gpt-4o-mini
```

## Caption File Structure

Location: `.appshot/captions/[device].json`

### Single Language (Simple Format)
```json
{
  "home.png": "Welcome to Our App",
  "features.png": "Powerful Features",
  "settings.png": "Customize Everything",
  "profile.png": "Your Personal Space",
  "share.png": "Connect with Friends"
}
```

### Multi-Language (App Store Localization)
```json
{
  "home.png": {
    "en": "Welcome to Our App",
    "es": "Bienvenido a Nuestra App",
    "fr": "Bienvenue dans Notre App",
    "de": "Willkommen in Unserer App",
    "it": "Benvenuto nella Nostra App",
    "pt": "Bem-vindo ao Nosso App",
    "ja": "アプリへようこそ",
    "ko": "우리 앱에 오신 것을 환영합니다",
    "zh-CN": "欢迎使用我们的应用"
  },
  "features.png": {
    "en": "Powerful Features",
    "es": "Características Poderosas",
    "fr": "Fonctionnalités Puissantes",
    "de": "Leistungsstarke Funktionen"
  }
}
```

## AI Translation Setup

### 1. Set API Key
```bash
export OPENAI_API_KEY="sk-your-key-here"

# Or add to .env file
echo 'OPENAI_API_KEY="sk-your-key-here"' >> .env
```

### 2. Available Models
- `gpt-4o-mini` - Fast, affordable, good for UI text (default)
- `gpt-4o` - Best quality, marketing-optimized
- `gpt-5` - Latest model (when available)

### 3. Translation Command Options
```bash
# Basic translation
appshot localize --langs es,fr,de

# With specific model
appshot localize --langs es,fr,de --model gpt-4o

# Only specific device
appshot localize --device iphone --langs es,fr
```

## All Supported Languages

### European Languages
- `en` - English
- `es` - Spanish (Spain)
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese (Portugal)
- `pt-BR` - Portuguese (Brazil)
- `nl` - Dutch
- `sv` - Swedish
- `no` - Norwegian
- `da` - Danish
- `fi` - Finnish
- `pl` - Polish
- `ru` - Russian

### Asian Languages
- `ja` - Japanese
- `ko` - Korean
- `zh-CN` - Simplified Chinese
- `zh-TW` - Traditional Chinese
- `hi` - Hindi
- `th` - Thai
- `vi` - Vietnamese
- `id` - Indonesian
- `ms` - Malay

### Middle Eastern
- `ar` - Arabic
- `he` - Hebrew
- `tr` - Turkish

## Direct Caption File Editing

For automation, directly write caption files:

### JavaScript/Node.js
```javascript
const fs = require('fs');

const captions = {
  "home.png": {
    "en": "Track Everything",
    "es": "Rastrea Todo",
    "fr": "Suivez Tout",
    "de": "Alles Verfolgen"
  },
  "dashboard.png": {
    "en": "Your Dashboard",
    "es": "Tu Panel",
    "fr": "Votre Tableau de Bord",
    "de": "Ihr Dashboard"
  }
};

fs.writeFileSync('.appshot/captions/iphone.json', 
  JSON.stringify(captions, null, 2));
```

### Bash
```bash
cat > .appshot/captions/iphone.json << 'EOF'
{
  "home.png": {
    "en": "Welcome",
    "es": "Bienvenido",
    "fr": "Bienvenue"
  }
}
EOF
```

## Caption Best Practices

### Marketing Captions (2-5 words)
Perfect for App Store screenshots:
- "Track Everything"
- "Stay Connected"
- "Powerful Analytics"
- "Real-Time Sync"
- "Beautiful Design"

### Feature Descriptions (5-10 words)
More descriptive captions:
- "Manage all your tasks in one place"
- "Real-time collaboration with your entire team"
- "Advanced analytics to track your progress"
- "Secure cloud sync across all devices"

### Character Limits by Device
- **iPhone** (narrow): ~20-25 characters before wrapping
- **iPad** (wide): ~40-50 characters per line
- **Mac** (widest): ~60-70 characters per line
- **Watch** (special): Auto-wraps to 2 lines max

### Caption Box for Consistency
Add to config to keep text area uniform:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 320,
  "maxHeight": 320
}
```

## App Store Caption Templates

### Productivity App
```json
{
  "onboarding.png": "Get Started in Seconds",
  "dashboard.png": "Everything at a Glance",
  "tasks.png": "Organize Your Work",
  "collaboration.png": "Work Better Together",
  "analytics.png": "Track Your Progress"
}
```

### Social Media App
```json
{
  "feed.png": "Stay Connected",
  "stories.png": "Share Your Moments",
  "messages.png": "Chat with Friends",
  "discover.png": "Explore New Content",
  "profile.png": "Your Personal Space"
}
```

### Fitness App
```json
{
  "home.png": "Your Fitness Journey",
  "workout.png": "Custom Workouts",
  "tracking.png": "Track Progress",
  "nutrition.png": "Meal Planning",
  "community.png": "Join the Community"
}
```

### E-Commerce App
```json
{
  "shop.png": "Browse Products",
  "categories.png": "Find What You Need",
  "cart.png": "Easy Checkout",
  "orders.png": "Track Orders",
  "deals.png": "Exclusive Deals"
}
```

## Building with Languages

### Build All Detected Languages
```bash
appshot build  # Automatically uses all languages found in captions
```

### Build Specific Languages Only
```bash
appshot build --langs en
appshot build --langs en,es,fr
```

### Output Structure with Languages
```
final/
├── iphone/
│   ├── en/
│   │   ├── home.png
│   │   ├── features.png
│   │   └── settings.png
│   ├── es/
│   │   ├── home.png      # Spanish captions
│   │   ├── features.png
│   │   └── settings.png
│   ├── fr/
│   │   └── [French versions]
│   └── de/
│       └── [German versions]
├── ipad/
│   ├── en/
│   └── [other languages]
```

## Caption Styling in Config

Control how captions appear:
```json
"caption": {
  "font": "Montserrat Bold",
  "fontsize": 96,
  "color": "#FFFFFF",
  "align": "center",          // left, center, right
  "position": "above",         // above, below, overlay
  "background": {
    "color": "#000000",
    "opacity": 0.65,
    "padding": 20
  },
  "border": {
    "color": "#FFFFFF",
    "width": 1,
    "radius": 20
  }
}
```

## Advanced Caption Features

### Dynamic Caption Height
Let captions auto-size based on content:
```json
"caption": {
  "box": {
    "autoSize": true,
    "maxLines": 3,
    "lineHeight": 1.4
  }
}
```

### Fixed Caption Height (Recommended)
Keep device position consistent:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 320,
  "maxHeight": 320
}
```

### Per-Device Caption Overrides
```json
"devices": {
  "iphone": {
    "captionFont": "Poppins Bold",
    "captionSize": 72,
    "captionPosition": "above"
  },
  "ipad": {
    "captionFont": "Inter",
    "captionSize": 64,
    "captionPosition": "below"
  }
}
```

## Troubleshooting Captions

### Text Cut Off
Increase caption box height:
```json
"captionBox": {
  "minHeight": 400,
  "maxHeight": 400
}
```

### Translation Failed
- Check `OPENAI_API_KEY` is set
- Verify API key is valid
- Check rate limits
- Try different model (`gpt-4o-mini` is most reliable)

### Wrong Language Showing
Check `defaultLanguage` in config:
```json
"defaultLanguage": "en"
```

### Missing Captions
- Screenshot file must exist first
- Filename must match exactly (case-sensitive)
- Caption file must be valid JSON

### Caption Not Centered
Verify alignment setting:
```json
"caption": {
  "align": "center"
}
```

## Bulk Caption Management

### Export Captions for Translation Service
```bash
# Extract all English captions
cat .appshot/captions/iphone.json | jq '.[].en' > english-captions.txt
```

### Import Translated Captions
```javascript
// After getting translations back
const translations = {
  "home.png": "Translated text",
  // ...
};

const existing = JSON.parse(fs.readFileSync('.appshot/captions/iphone.json'));
Object.keys(translations).forEach(key => {
  if (!existing[key]) existing[key] = {};
  existing[key].es = translations[key];
});
fs.writeFileSync('.appshot/captions/iphone.json', JSON.stringify(existing, null, 2));
```

## Caption History and Suggestions

AppShot learns from your captions:
- Autocomplete suggestions based on frequency
- Device-specific suggestions
- Pattern detection ("Track your *", "Manage your *")

Clear history if needed:
```bash
rm .appshot/caption-history.json
```