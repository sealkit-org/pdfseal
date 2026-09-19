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

### 🛠️ 14 Core Local PDF Utilities (100% Free & Unlimited)

*All atomic utilities execute entirely client-side in browser RAM with zero arbitrary limits, no watermark penalties, and zero data leakage:*

- **Merge PDFs**: Combine multiple documents in custom order with intuitive drag-and-drop. Features real-time page count aggregation, pre-merge thumbnail preview, and instant stage-three delivery relays to seamlessly chain into compression or protection.
- **Organize & Rotate**: Visual thumbnail grid workbench to reorder, multi-select with Shift or drag-box selection, rotate pages 90°/180°, and delete unneeded pages. Insert standard blank A4 pages anywhere (complete with multilingual watermark placeholders) or append external files, backed by a 30-step lossless undo/redo history stack and selective-page export.
- **Split & Extract**: Precision document slicing across 4 dedicated operational modes: *Extract to Single PDF* (isolate specific pages or ranges like `1-3, 5, 8-end`), *Burst to Single Pages* (split the entire document into N distinct one-page files), *Fixed Step Split* (divide evenly every N pages), and *Custom Range Segmentation*. Export directly as standalone PDFs or bundled into a ZIP archive.
- **Smart Compress**: Reduce file size by up to 90% across 4 fine-tuned modes: *Balanced (300 DPI)* for crisp readability; *Extreme (150 DPI)* for tight email caps; *Lossless Object Stream Compression* for structural optimization without rasterization; and **Target Size Bisection** (specify exact thresholds like ≤ 2MB, auto-tuning resolution and quality factors in-browser). All modes are guarded by a Universal Anti-Inflation Size Guard.
- **Watermark & Protect**: High-DPI transparent canvas watermark stamping engine. Supports multilingual typography, custom font sizing, opacity, tilt angles (-90° to 90°), repetitive grid tiling or centered placement, quick color swatches (Official Red, Navy Blue), and custom hex values, with direct chaining into owner-level permission encryption.
- **Dynamic Page Numbering**: Professional document pagination. Supports customizable format macros (`{n}`, `{total}`, `Page {n} of {total}`, etc.), 6 header/footer alignment anchors, odd/even mirror flipping, and cover page skipping (starting page 1 on sheet 2). Features proprietary **Whiteout Masking** (full-ribbon or local bounding box) with canvas color auto-sampling to cleanly conceal misaligned legacy page numbers.
- **Sign & Stamp**: Engineered for rigorous contract signing. Supports freehand drawing, typography-generated signatures, and uploaded seal images. Proprietary local background flattening automatically strips camera shadows and paper whiteout, with instant ink recoloring (Original, Ink Black, Deep Blue, Stamp Red). One-click batch initial placement across all, even, odd, or non-terminal pages, backed by a persistent local seal library and positioning presets.
- **PDF to Image**: High-fidelity rasterization of PDF pages into crisp PNG or JPG images. Choose between *Standard 150 DPI* for web distribution and *Print-Grade 300 DPI* for archival clarity. Download individual pages directly from thumbnail cards or export the complete set as a zipped archive in one click.
- **Image to PDF**: Convert batches of PNG, JPG, WebP, and BMP images into a unified multi-page PDF. Offers standardized A4 dimensions (with auto-orientation and proportional centered margins) or adaptive native-image sizing, ideal for expense receipt collation and identity document archiving.
- **Protect & Encrypt**: Modern high-grade AES-256 client-side encryption. Protect documents with an **Open Password (User Password)** to prevent unauthorized reading, and set an **Owner Password** to enforce granular operational restrictions (prohibiting unauthorized printing, text/image extraction, form alterations, and annotating), securing distributed contracts without sending keys to the cloud.
- **Unlock & Strip Restrictions**: Permanently remove encryption locks and permission restrictions. After validating the document password, the client engine restructures the internal object streams to permanently purge encryption dictionaries, yielding a clean, unrestricted, plaintext PDF.
- **Scrub Metadata**: Essential privacy purification for government, corporate audits, and sensitive disclosures. Deeply audits and permanently purges hidden forensic metadata and underlying attributes: document titles, author names, company names, software fingerprints (Word, WPS, InDesign), timestamps, camera GPS coordinates, private application dictionaries (PieceInfo), and embedded thumbnail caches.
- **Redact Content**: High-assurance physical byte-level redaction for sensitive text and images in document content streams. Draw visual boxes with automatic snap-to-text boundary precision, or batch-mark via smart search (keywords or localized regex presets for ID/SSN, phone, bank cards, emails, and universal dates). Supports per-mark and whole-page replication, blackout, whiteout, dark gray, custom color blocks, and [REDACTED] stamps. Re-parses output to verify zero extractable text residue before export; target text is permanently destroyed and cannot be recovered.
- **Local Privacy Vault**: Secure in-browser document staging and archive powered by IndexedDB with zero network telemetry. Leverages native Web Crypto SHA-256 content hashing for automatic deduplication, toggleable grid/list views, automatic or one-click post-processing storage, and instant reloading into downstream editing tools.

> 💡 **Unified Three-Stage Delivery Architecture**: All 13 core interactive processing tools feature a standardized three-step workflow (« ① Upload File → ② Configure & Process → ③ Delivery & Next Relays »), complete with before/after size & ratio metric badges, seamless full-screen preview, one-click re-download, « Return to Edit » state preservation, and next-action relays (e.g., compress immediately after merging, or add watermarks right after signing).

---

### ⚡ Automated Workflow & Batch Processing Pipeline

*Chain multiple standalone PDF operations into an automated, single-click assembly line:*

- **Battle-Tested Presets**:
  - 📁 **Tender & Sensitive Document Sanitizer**: Metadata scrubbing $\rightarrow$ Balanced compression $\rightarrow$ Anti-leak watermark stamping.
  - 🧾 **Expense Receipts Auto-Packer**: Multi-image to A4 PDF conversion $\rightarrow$ Compression sized for reimbursement portals.
  - 📑 **Contract Batch Stamping & Archive**: Permission unlock $\rightarrow$ Last page signature stamping $\rightarrow$ Security watermark.
- **Visual Drag & Drop Pipeline Builder**:
  - Reorder, configure, add, or remove steps with live node compatibility port validation.
  - Real-time multi-file batch execution with step-by-step progress tracking, cancellation support, and active event loop yielding.
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
- **Internationalization**: Vue I18n (Full support for 🇺🇸 English, 🇩🇪 German, 🇪🇸 Spanish, 🇫🇷 French, 🇨🇳 Simplified Chinese)
- **Local Storage**: IndexedDB with structured transactional stores (Privacy Vault)
- **Performance & Scheduling**: Active Event Loop Yielding to prevent UI freezing during intensive WASM/canvas computations
- **Testing Suite**: [Vitest](https://vitest.dev/) & [Puppeteer](https://pptr.dev/) (**30 unit test suites, 186 unit tests 100% passing**, plus headless browser E2E regression suites)

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

# 5. Run headless browser end-to-end (E2E) regression tests
npm run test:e2e

# 6. Build for production (generates PWA Service Worker)
npm run build
```

### 🐳 Self-Host with Docker

```bash
# One-click start with Docker Compose (serves on http://localhost:8080)
docker compose up -d
```


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
