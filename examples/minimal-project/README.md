# Minimal Appshot Example

This is a minimal example project showing how to use Appshot to generate App Store screenshots.

## Structure

```
minimal-project/
├── .appshot/                    # Configuration directory
│   ├── config.json             # Main configuration
│   └── captions/               # Device-specific captions
│       ├── iphone.json
│       ├── ipad.json
│       ├── mac.json
│       └── watch.json
├── screenshots/                 # Input screenshots
│   ├── iphone/
│   │   ├── home.png           # Add your screenshots here
│   │   ├── calendar.png
│   │   └── tasks.png
│   ├── ipad/
│   │   ├── dashboard.png      # Add your screenshots here
│   │   └── editor.png
│   ├── mac/
│   └── watch/
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
   - `screenshots/mac/` for Mac screenshots
   - `screenshots/watch/` for Apple Watch screenshots

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

The `.appshot/config.json` file controls the appearance of your screenshots:

```json
{
  "gradient": {
    "colors": ["#FF5733", "#FFC300"],
    "direction": "top-bottom"
  },
  "caption": {
    "font": "SF Pro",
    "fontsize": 64,
    "color": "#FFFFFF",
    "position": "above"
  },
  "devices": {
    "iphone": {
      "resolution": "1290x2796",
      "partialFrame": true,
      "frameOffset": 25
    }
  }
}
```

### Advanced Device Styling

Control how devices appear in screenshots:

- **partialFrame**: Cut off bottom portion of device frame for dynamic look
- **frameOffset**: Percentage to cut off (default: 25)

Example for Apple Watch:
```json
{
  "devices": {
    "watch": {
      "resolution": "396x484",
      "partialFrame": true,
      "frameOffset": 30  // Cut off bottom 30% to hide band
    }
  }
}
```

## Multi-language Support

The caption files in `.appshot/captions/` support multiple languages:

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
- Use `partialFrame` for a modern, dynamic appearance