<div align="center">

# 🦭 PDFSeal

**100% 私密、极速、浏览器本地运行的 PDF 工具箱，支持自动化流水线。**
*文件封存在你的浏览器里。零云端上传。100% 离线可用。零跟踪。*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![PWA: Offline Ready](https://img.shields.io/badge/PWA-100%25%20Offline%20Ready-emerald.svg)](https://pdf.sealkit.org)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Local-green.svg)](#-隐私与安全承诺)
[![Live Demo](https://img.shields.io/badge/Official%20Web%20App-pdf.sealkit.org-6366f1.svg)](https://pdf.sealkit.org)
[![Ko-fi](https://img.shields.io/badge/Support%20Project-Ko--fi-ff5f5f.svg)](https://ko-fi.com/muffin27)

</div>

<p align="center">
  <a href="https://pdf.sealkit.org"><b>🌐 打开官方在线版（pdf.sealkit.org）→</b></a>
</p>

<p align="center">
  <a href="./README.md">English</a> | 简体中文
</p>

---

## 📖 PDFSeal 名字的由来 & 我们的吉祥物 🦭

为什么叫 **PDFSeal**？英文里 **"Seal"** 有一个巧妙的双关：

1. **封条 / 印章**：你的文档被*严格封存*在本地设备的浏览器内存中，零字节上传到任何云端服务器。
2. **小海豹 🦭**：认识一下 **Sammy**（小海豹），我们友好的文档守护者！Sammy 确保你的纳税申报表、法律合同和财务票据严格保密、绝无跟踪。

> *"把文件丢进来，让小海豹替你整理和处理，带着十足的隐私安心离开。"*

---

## ✨ 功能与架构

### 🛠️ 11 个核心本地 PDF 工具（100% 免费且无限制）

*所有原子工具完全在浏览器内存中客户端运行，无人为限制、无水印惩罚：*

- **PDF 合并**：自定义顺序拖拽合并多个文档。
- **智能压缩**：3 种精细模式最高压缩 90% 体积（*均衡 300 DPI*、*极限 150 DPI*、*无损对象流压缩*），并有通用防膨胀体积护栏。
- **页面整理**：可视化缩略图网格，支持排序、90°/180° 旋转、删除多余页面。
- **页面拆分**：选择单页或自定义页码范围（如 `1-3, 5, 8-end`）即时导出。
- **水印与保护**：高 DPI 透明画布水印，支持多语言排版和可选的所有者级权限锁定。
- **电子签名与盖章**：嵌入手写签名或公章，提供常用位置预设（*末页右下角*、*首页*等）。
- **图片转 PDF**：将 PNG、JPG、WebP 图片合成为标准 A4 或自适应多页 PDF 文档。
- **PDF 转图片**：将 PDF 每页渲染为清晰 PNG 或 JPG，支持*标准 150 DPI* 和*印刷级 300 DPI*——可在页面缩略图上直接下载单页，或整册打包为 ZIP。
- **解锁与解除限制**：解密带密码的文件，永久解除打印/复制权限锁。
- **深度元数据清理**：彻底清除文档作者、编辑软件、创建时间戳、GPS 数据和内嵌缩略图。
- **海豹收纳箱（本地隐私保险库）**：基于 IndexedDB 的浏览器内文档归档，配备 Web Crypto SHA-256 重复检测。

---

### ⚡ 自动化流水线与批量处理

*将多个独立 PDF 操作串联为一键执行的自动化流水线：*

- **久经考验的预设流程**：
  - 📁 **招投标与涉密文档预处理**：深度元数据清理 → 均衡压缩 → 防泄漏水印。
  - 🧾 **报销票据自动打包**：多图转 A4 PDF → 按报销门户要求压缩体积。
  - 📑 **合同批量盖章与归档**：权限解锁 → 末页签名盖章 → 安全水印。
- **可视化拖拽流水线编辑器**：
  - 重新排序、配置参数、增删步骤，实时节点兼容性端口校验。
  - 多文件批量执行，逐步进度跟踪，支持取消。
  - 批量导出选项：顺序下载、自动归档至海豹收纳箱、动态命名模板（`{original}_{date}_{index}`）。

---

### 📲 PWA 渐进式应用与真·离线保证

- **免管理员桌面安装**：直接从 Chrome、Edge 或 Safari 将 PDFSeal 安装为独立窗口应用，无需 IT 管理员权限。
- **100% 飞行模式可靠性**：基于 `vite-plugin-pwa` 与 Workbox，350+ 核心依赖（含 CJK 字体映射与标准字体二进制文件）自动预缓存。
- **断网刷新验证**：完全断网时按 `F5`，PDFSeal 依然满血加载运行，不发出任何一个网络请求。

---

### 🔐 零知识端到端加密传输（Seal Send）

- 通过客户端 **AES-GCM-256** 加密在设备间传输敏感文档。
- 加密密钥仅保留在 URL 锚点（`#key=...`）中，永远不会发送到服务器或 CDN。

---

## 🔒 隐私与安全承诺

- **零服务器上传**：所有处理 100% 在你的浏览器内完成（WebAssembly + JavaScript，`pdf-lib` + `pdf.js`）。
- **离线可用**：断开 Wi-Fi 或开启飞行模式，所有核心功能依然完美运行。
- **零跟踪**：无用户跟踪、无第三方遥测、无用户指纹采集。

---

## 🛠️ 技术栈

- **框架**：[Vue 3](https://vuejs.org/)（Composition API、`<script setup>`）
- **构建工具**：[Vite 6](https://vitejs.dev/) + [VitePWA](https://vite-pwa-org.netlify.app/)
- **样式与 UI**：[Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **PDF 引擎**：[pdf-lib](https://pdf-lib.js.org/) & [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **安全与加密**：原生 Web Crypto API（SubtleCrypto AES-GCM-256、SHA-256）
- **本地存储**：IndexedDB 结构化事务存储
- **测试**：[Vitest](https://vitest.dev/)（26 个测试套件，95 项单元测试）

---

## 💻 本地开发与构建

```bash
# 1. 克隆仓库
git clone https://github.com/sealkit-org/pdfseal.git
cd pdfseal

# 2. 安装依赖
npm install

# 3. 启动本地开发服务器
npm run dev

# 4. 运行自动化单元测试
npm test

# 5. 生产构建（生成 PWA Service Worker）
npm run build
```

---

## 🗺️ 路线图

**近期已上线**

- ✅ **PDF 转图片**——PNG/JPG 导出，支持 150/300 DPI、单页下载与整册 ZIP 打包
- ✅ **自动化批量流水线**——拖拽式节点编辑器，内置预设与实时兼容性校验

**规划中**

- 🔜 **签名工具体验升级**——简签一键批量应用到多页、本地常用签名/印章库、手机拍照签名自动去白底
- 🔜 **页面整理升级**——Shift / 框选多选页面批量旋转与删除、任意位置插入空白页或追加外部文件
- 🔜 更多界面语言（欢迎社区贡献！）

> 有功能想法？[提交 Issue](https://github.com/sealkit-org/pdfseal/issues)——真实注重隐私的用户反馈决定这个路线图的走向。

---

## 🐟 给 Sammy 喂条鱼（买杯咖啡！）

PDFSeal 由独立开发者社区驱动。如果这个工具为你节省了时间、减少了烦恼：

👉 **[给小海豹 Sammy 喂条鱼（Ko-fi）☕ 🐟](https://ko-fi.com/muffin27)**

---

## 📄 开源许可与企业商业授权

### 开源社区许可

PDFSeal 是基于 **[GNU Affero 通用公共许可证 v3.0（AGPLv3）](LICENSE)** 的自由软件。如果你运行修改版的 PDFSeal 或将其作为网络服务提供，你必须以相同的 AGPLv3 条款公开完整的修改源代码。

### 企业商业许可与内网部署

如果你的组织需要在商业专有环境中使用 PDFSeal、内网本地化部署，或在不承担 AGPLv3 传染义务的情况下进行定制集成，请获取**企业商业许可**。

商业咨询、授权协议或企业部署，请联系：
📫 **license@sealkit.org** 或访问 **[pdf.sealkit.org](https://pdf.sealkit.org)**。
