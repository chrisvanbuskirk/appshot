# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of Appshot seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:
- Open a public GitHub issue
- Post about it publicly on social media

### Please DO:
- Email us directly at: [your-security-email@example.com]
- Use GitHub's Security Advisories feature (preferred)

### What to include:
- Type of issue (e.g., command injection, path traversal, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

### What to expect:
- Acknowledgment of your report within 48 hours
- Regular updates on our progress
- Credit in the release notes (unless you prefer to remain anonymous)

## Security Considerations

### File System Access
Appshot reads and writes files based on user configuration. Always:
- Validate file paths to prevent directory traversal
- Use proper file permissions
- Sanitize user input

### Dependencies
We regularly update dependencies to patch known vulnerabilities:
- Run `npm audit` to check for vulnerabilities
- Use `npm audit fix` to automatically fix issues
- Review and update dependencies monthly

### API Keys
When implementing features that use external APIs:
- Never commit API keys to the repository
- Use environment variables for sensitive data
- Document required environment variables clearly
- Validate and sanitize API responses

## Disclosure Policy

When we receive a security report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.