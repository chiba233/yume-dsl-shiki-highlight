# Security Policy

## Supported versions

| Version | Supported          |
|---------|--------------------|
| 2.x     | Yes                |
| 1.x     | No (EOL at 2.0.0)  |

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report them privately via one of the following:

- **GitHub private vulnerability reporting**: Go to the [Security](https://github.com/chiba233/yume-dsl-shiki-highlight/security/advisories/new) tab and click "Report a vulnerability".
- **Email**: Send details to the repository maintainer (see GitHub profile).

### What to include

1. Description of the vulnerability
2. Steps to reproduce
3. Affected version
4. Impact assessment (if known)

### What to expect

- Acknowledgment within **48 hours**
- Status update within **7 days**
- A fix or mitigation plan for confirmed vulnerabilities

## Scope

This policy covers `yume-dsl-shiki-highlight`. It does **not** cover:

- Vulnerabilities in rendering layers you build on top of the highlighter (that's your application code)
- Denial of service via extremely large input — use `depthLimit` and input size limits in your application

## Known security considerations

- **Theme integration**: If you map highlight tokens into HTML or a UI layer, escape token content appropriately.
- **Large inputs**: Highlighting is structural and recursive. Apply input size limits in untrusted environments.
