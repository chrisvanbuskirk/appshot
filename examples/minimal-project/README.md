# Minimal Appshot Example

This is a minimal example project showing how to use Appshot to generate App Store screenshots.

## Structure

```
minimal-project/
├── appshot.json                 # Configuration file
├── screenshots/                 # Input screenshots
│   ├── iphone/
│   │   ├── captions.json       # Captions for iPhone screenshots
│   │   ├── home.png           # Add your screenshots here
│   │   ├── calendar.png
│   │   └── tasks.png
│   └── ipad/
│       ├── captions.json       # Captions for iPad screenshots
│       ├── dashboard.png      # Add your screenshots here
│       └── editor.png
├── frames/                      # Device frames (optional)
│   ├── iphone-15-pro.png
│   └── ipad-pro-12.9.png
└── final/                       # Output directory (created by build)
```

## Quick Start

1. **Add your screenshots**
   
   Place your app screenshots in the appropriate device folders:
   - `screenshots/iphone/` for iPhone screenshots
   - `screenshots/ipad/` for iPad screenshots

2. **Edit captions**
   
   Run the interactive caption editor:
   ```bash
   appshot caption --device iphone
   appshot caption --device ipad
   ```

3. **Build final screenshots**
   
   Generate the final screenshots with frames and captions:
   ```bash
   appshot build
   ```

   The final screenshots will be saved to the `final/` directory.

## Configuration

The `appshot.json` file controls the appearance of your screenshots:

- **gradient**: Background gradient colors and direction
- **caption**: Font settings for the caption text
- **devices**: Input directories and output resolutions for each device

## Multi-language Support

The captions.json files support multiple languages:

```json
{
  "screenshot.png": {
    "en": "English caption",
    "fr": "French caption",
    "es": "Spanish caption"
  }
}
```

Build screenshots for specific languages:
```bash
appshot build --langs en,fr,es
```

## Tips

- Use high-quality screenshots at the device's native resolution
- Keep captions short and impactful
- Test different gradient colors to match your brand
- Add device frames for a more professional look