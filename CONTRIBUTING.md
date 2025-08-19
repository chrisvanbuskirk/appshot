# Contributing to Appshot

Thank you for your interest in contributing to Appshot! We welcome contributions from the community.

## Development Setup

1. Fork and clone the repository:
```bash
git clone git@github.com:YOUR_USERNAME/appshot.git
cd appshot
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Link for local development:
```bash
npm link
```

Now you can use `appshot` command globally with your local changes.

## Development Workflow

### Running in development mode
```bash
npm run dev -- [command] [options]
```

### Running tests
```bash
npm test
```

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Project Structure

```
appshot/
├── src/           # TypeScript source code
│   ├── cli.ts     # Main CLI entry point
│   ├── commands/  # CLI command implementations
│   ├── core/      # Core business logic
│   └── types.ts   # TypeScript type definitions
├── tests/         # Test files
├── assets/        # Bundled assets (frames, specs)
└── examples/      # Example projects
```

## Adding New Features

### Adding a new command

1. Create a new file in `src/commands/[command].ts`
2. Export a function that returns a Commander command
3. Import and add it to `src/cli.ts`

### Adding device frames

1. Add frame PNG files to `assets/frames/`
2. Create a metadata JSON file with screen coordinates
3. Update the frames registry in `src/core/devices.ts`

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Keep functions small and focused
- Add JSDoc comments for public APIs
- Write tests for new features

## Commit Messages

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or changes
- `chore:` Maintenance tasks
- `refactor:` Code refactoring

Examples:
```
feat: add support for Android device frames
fix: correct gradient rendering on Safari
docs: update README with new CLI options
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add/update tests as needed
4. Update documentation if needed
5. Ensure all tests pass
6. Submit a pull request

### PR Title Format
Use the same conventional commit format for PR titles.

### PR Description
- Describe what changes you made
- Explain why these changes are needed
- Reference any related issues
- Include screenshots for UI changes

## Testing

Write tests for:
- New commands
- Core logic functions
- Bug fixes (to prevent regression)

Run tests with:
```bash
npm test
```

## Documentation

Update documentation for:
- New CLI commands or options
- Configuration changes
- New features
- Breaking changes

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about contributing
- General discussion

## License

By contributing, you agree that your contributions will be licensed under the MIT License.