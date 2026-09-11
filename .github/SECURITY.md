# Security & Privacy Policy

## 🦭 Our Core Commitment: 100% Client-Side Privacy

PDFSeal is built on an uncompromising principle: **Your documents never leave your machine.**

- All PDF parsing, manipulation, rendering, OCR, compression, encryption, and signing are performed strictly inside your browser's local sandbox memory (`ArrayBuffer` / WebAssembly / Canvas).
- PDFSeal has **no backend processing servers**.
- PDFSeal uses **no third-party tracking cookies** and transmits no user files over the wire.

---

## Supported Versions

Only the latest release running on the official domain [pdf.sealkit.org](https://pdf.sealkit.org) and the latest commit on `main` branch are actively supported with security updates.

| Version | Supported |
| --- | --- |
| Latest `main` / `pdf.sealkit.org` | :white_check_mark: |
| Self-hosted Docker `:latest` | :white_check_mark: |
| Older revisions | :x: |

---

## Reporting a Vulnerability

We take the security and privacy of our users extremely seriously. If you discover a security vulnerability, please follow responsible disclosure guidelines:

1. **Do NOT open a public GitHub issue** describing the vulnerability.
2. Please privately disclose the issue via GitHub's [Private Security Advisories](https://github.com/sealkit-org/pdfseal/security/advisories/new) or send an email to security@sealkit.org.
3. Include detailed steps to reproduce the vulnerability, including browser version, environment, and proof of concept.

### Scope of Interest
- Inadvertent network leakages (e.g. any code path that could transmit document data or metadata externally).
- Cross-Site Scripting (XSS) within the browser sandbox.
- Prototype pollution or arbitrary code execution vectors in client-side PDF parsers.
- WebCrypto key leakage in Vault or P2P transfer modules.

We strive to acknowledge all reports within 48 hours and provide a timeline for remediation. Thank you for keeping PDFSeal secure! 🐟
