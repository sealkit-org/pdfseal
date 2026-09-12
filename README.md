<div align="center">

# 🦭 PDFSeal

**100% Private, Fast, and In-Browser PDF Toolkit with Automated Pipelines.**  
*Sealed locally in your browser. Zero cloud uploads. 100% offline-ready. No trackers.*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![PWA: Offline Ready](https://img.shields.io/badge/PWA-100%25%20Offline%20Ready-emerald.svg)](https://pdf.sealkit.org)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Local-green.svg)](#-privacy--security-guarantee)
[![Live Demo](https://img.shields.io/badge/Official%20Web%20App-pdf.sealkit.org-6366f1.svg)](https://pdf.sealkit.org)
[![Ko-fi](https://img.shields.io/badge/Support%20Project-Ko--fi-ff5f5f.svg)](https://ko-fi.com/muffin27)

</div>

<p align="center">
  <a href="https://pdf.sealkit.org"><b>🌐 Launch Official Web App (pdf.sealkit.org) →</b></a>
</p>

<p align="center">
  English | <a href="./README.zh-CN.md">简体中文</a>
</p>

---

## 📖 The Story Behind PDFSeal & Our Mascot 🦭

Why **PDFSeal**? In English, **"Seal"** has a charming double meaning:

1. **The Security Seal**: Your documents are *strictly sealed* inside your local device's browser memory. Zero bytes are ever uploaded to any cloud server.
2. **The Seal Mascot 🦭**: Meet **Sammy the Seal**, our friendly document guardian! Sammy ensures your private tax forms, legal contracts, and financial receipts remain strictly confidential and untracked.

> *"Drop your files in, let the little seal organize and process them, and leave with complete privacy peace of mind."*

---

## ✨ Features & Architecture

### 🛠️ 11 Core Local PDF Utilities (100% Free & Unlimited)

*All atomic tools run entirely client-side in browser RAM with no arbitrary limits or watermark penalties:*

- **Merge PDFs**: Combine multiple documents in custom order with intuitive drag-and-drop.
- **Smart Compress**: Reduce file size by up to 90% across 3 fine-tuned modes (*Balanced 300 DPI*, *Extreme 150 DPI*, and *Lossless Object Stream Compression*) protected by a Universal Anti-Inflation Size Guard.
- **Reorder & Rotate**: Visual thumbnail grid to reorder, rotate pages 90°/180°, or delete unneeded pages.
- **Split & Extract**: Select individual pages or custom page ranges (e.g. `1-3, 5, 8-end`) to export instantly.
- **Watermark & Protect**: High-DPI transparent canvas watermarks supporting multi-language typography and optional owner-level permissions locking.
- **Sign & Stamp**: Embed handwritten signatures or official seals with instant placement presets (*Last Page Bottom Right*, *First Page*, etc.).
- **Image to PDF**: Convert PNG, JPG, and WebP images into standard A4 or auto-fitted multi-page PDF documents.
- **PDF to Image**: Render each PDF page as a crisp PNG or JPG at *Standard 150 DPI* or *print-grade 300 DPI* — download single pages or the entire batch as a ZIP, right from the page thumbnails.
- **Unlock & Strip Restrictions**: Decrypt password-protected files and permanently strip printing/copying permission locks.
- **Deep Metadata Sanitizer**: Permanently purge document author, editing software, creation timestamps, GPS data, and embedded thumbnails.
- **Local Privacy Vault**: Secure in-browser document archive powered by IndexedDB with Web Crypto SHA-256 duplicate detection.

---

### ⚡ Automated Workflow & Batch Processing Pipeline

*Chain multiple standalone PDF operations into an automated, single-click assembly line:*

- **Battle-Tested Presets**:
  - 📁 **Tender & Sensitive Document Sanitizer**: Deep metadata sanitization $\rightarrow$ Balanced compression $\rightarrow$ Anti-leak watermark stamping.
  - 🧾 **Expense Receipts Auto-Packer**: Multi-image to A4 PDF conversion $\rightarrow$ Compression sized for reimbursement portals.
  - 📑 **Contract Batch Stamping & Archive**: Permission unlock $\rightarrow$ Last page signature stamping $\rightarrow$ Security watermark.
- **Visual Drag & Drop Pipeline Builder**:
  - Reorder, configure, add, or remove steps with live node compatibility port validation.
  - Real-time multi-file batch execution with step-by-step progress tracking and cancellation support.
  - Batch export options: sequential download, automatic local Vault archiving, and dynamic token naming (`{original}_{date}_{index}`).

---

### 📲 Progressive Web App (PWA) & True Offline Guarantee

- **No-Admin Desktop Installation**: Install PDFSeal as a standalone, windowed application directly from Chrome, Edge, or Safari without requiring IT administrator privileges.
- **100% Airplane Mode Reliability**: Powered by `vite-plugin-pwa` and Workbox, 350+ core dependencies (including CJK font maps and standard font binaries) are automatically pre-cached.
- **F5 Refresh Proof**: Press `F5` while completely disconnected from the internet, and PDFSeal reloads and operates at 100% capacity without a single network request.

---

### 🔐 Zero-Knowledge End-to-End Encrypted Transfer (Seal Send)

- Transfer sensitive documents between devices with client-side **AES-GCM-256** encryption.
- Encryption keys are kept solely in the URL fragment (`#key=...`) and are never sent to servers or CDNs.

---

## 🔒 Privacy & Security Guarantee

- **Zero Server Uploads**: Processing is executed 100% inside your browser using WebAssembly and JavaScript (`pdf-lib` + `pdf.js`).
- **Offline Capable**: Disconnect your Wi-Fi or enable Airplane Mode, and all core features will still work flawlessly.
- **Zero Tracking**: No user tracking, no third-party telemetry, no user fingerprinting.

---

## 🛠️ Technology Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Build Tool**: [Vite 6](https://vitejs.dev/) with [VitePWA](https://vite-pwa-org.netlify.app/)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **PDF Engine**: [pdf-lib](https://pdf-lib.js.org/) & [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **Security & Cryptography**: Native Web Crypto API (SubtleCrypto AES-GCM-256, SHA-256)
- **Local Storage**: IndexedDB with structured transactional stores
- **Testing**: [Vitest](https://vitest.dev/) (26 test suites, 95 unit tests)

---

## 💻 Local Development & Build

```bash
# 1. Clone the repository
git clone https://github.com/sealkit-org/pdfseal.git
cd pdfseal

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Run automated unit test suite
npm test

# 5. Build for production (generates PWA Service Worker)
npm run build
```

### 🐳 Self-Host with Docker

```bash
# One-click start with Docker Compose (serves on http://localhost:8080)
docker compose up -d
```


---

## 🗺️ Roadmap

**Recently shipped**

- ✅ **PDF to Image converter** — PNG/JPG export at 150/300 DPI with single-page and batch ZIP download
- ✅ **Automated batch pipeline** — drag-and-drop node builder with presets and live compatibility validation
- ✅ **Signature tool upgrade** — apply initials across all pages in one click, a locally saved signature/seal library, and automatic white-background & shadow removal for photographed signatures
- ✅ **Organize tool upgrade** — Shift / box multi-select for batch rotate & delete, insert blank pages (multilingual watermark) or append external files anywhere, with 30-step undo/redo stack

**Planned next**

- 🔜 **Page Numbering system** — flexible format macros (`Page {n} of {total}`), cover page exclusion, and 6 header/footer alignment anchors
- 🔜 **Target file size compression** — specify hard size caps (e.g. ≤ 2MB) with binary search auto-tuning
- 🔜 More interface languages (community contributions welcome!)

> Have a feature idea? [Open an issue](https://github.com/sealkit-org/pdfseal/issues) — feedback from real privacy-conscious users shapes this roadmap.

---

## 🐟 Support Sammy (Buy the Seal a Fish / Coffee!)

PDFSeal is independent and community-driven. If this tool saved you time or frustration:

👉 **[Support Sammy the Seal on Ko-fi ☕ 🐟](https://ko-fi.com/muffin27)**

---

## 📄 License & Enterprise Commercial Licensing

### Open-Source Community License

PDFSeal is free software licensed under the **[GNU Affero General Public License v3.0 (AGPLv3)](LICENSE)**. If you run a modified version of PDFSeal or provide it as a network service, you must release your complete modified source code under the same AGPLv3 terms.

### Enterprise Commercial License & Intranet Deployment

If your organization requires using PDFSeal in a commercial proprietary environment, intranet on-premise deployment, or custom integration without the copyleft obligations of the AGPLv3, please obtain an **Enterprise Commercial License**.

For commercial inquiries, licensing agreements, or enterprise deployments, contact us at:  
📫 **license@sealkit.org** or via our portal at **[pdf.sealkit.org](https://pdf.sealkit.org)**.
