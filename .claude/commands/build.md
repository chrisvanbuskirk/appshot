# /build Command

Builds and installs the appshot CLI tool locally for testing.

## Usage

```bash
/build
```

## What it does

1. **Cleans** - Removes previous build artifacts from `dist/`
2. **Installs** - Ensures npm dependencies are installed
3. **Builds** - Compiles TypeScript code to JavaScript in `dist/`
4. **Links** - Runs `npm link` to make `appshot` command available globally
5. **Verifies** - Checks that the installation succeeded

## Prerequisites

- Node.js and npm installed
- You're in the appshot project directory

## After running

Once complete, you can use the `appshot` command from anywhere:

```bash
appshot --help
appshot init
appshot build
appshot caption --device iphone
```

## Troubleshooting

If the `appshot` command is not found after building:

1. Check that `/usr/local/bin` is in your PATH
2. Try running `npm link` again manually
3. On some systems, you may need to use `sudo npm link`

## Related Commands

- `/commit` - Create a PR with your changes
- `npm run dev` - Run commands in development mode without building