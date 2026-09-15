# Contributing to PDFSeal 🦭

Thank you for your interest in contributing to **PDFSeal**! We welcome community contributions of all kinds: bug fixes, algorithmic optimizations, UI refinements, new language translations, and documentation improvements.

---

## 🛡️ The Golden Rule: 100% Client-Side Privacy

Before writing any code, please keep in mind PDFSeal's core architectural invariant:

> **All PDF processing must happen 100% locally in the client's browser memory.**  
> Any PR that introduces network uploads of documents, third-party analytics trackers, or server-side document manipulation will be strictly rejected.

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 22.x, 24.x, or 26.x (Node 20 is not supported: pdfjs-dist 4.10+ requires `Promise.withResolvers`)
- npm 10+ (or pnpm)

### Getting Started

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/sealkit-org/pdfseal.git
   cd pdfseal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🧪 Testing Guidelines

We maintain a comprehensive suite of unit, algorithmic, and end-to-end regression tests using **Vitest**.

- **Run all unit & algorithm tests**:
  ```bash
  npm test
  ```
- **Run in watch mode during development**:
  ```bash
  npx vitest
  ```
- **Run E2E browser tests**:
  ```bash
  npm run test:all
  ```

> 💡 **Tip**: Every PR must pass `npm test` before it can be merged. If you are adding a new feature or PDF transformation, please include matching tests in the `tests/` directory.

---

## 🌍 Adding or Improving Translations (i18n)

PDFSeal currently supports 5 languages:
- `en` (English - default)
- `zh-CN` (Simplified Chinese)
- `de` (German)
- `es` (Spanish)
- `fr` (French)

To add missing keys or improve wording:
1. Locate language dictionaries under `src/locales/`.
2. Update the corresponding JSON/JS dictionary files.
3. Run `npm test` to verify dictionary completeness across all supported locales.

---

## 📦 Pull Request Process

1. Create a descriptive feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with clear, semantic commit messages (e.g. `feat(tools): add batch sign option`, `fix(compress): prevent canvas blowout`).
3. Ensure all tests pass:
   ```bash
   npm test
   npm run build
   ```
4. Push to your fork and submit a Pull Request targeting the `main` branch.
5. Fill out the PR template checklist to confirm that client-side privacy invariants are upheld.

---

## 🐟 Code of Conduct

Be kind, respectful, and collaborative. We are here to build useful, privacy-respecting software together!
