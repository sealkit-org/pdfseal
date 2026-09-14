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

### 🛠️ 13 个核心本地 PDF 工具（100% 免费且无限制）

*所有原子工具完全在浏览器内存中客户端运行，无人为限制、无水印惩罚、零隐私外泄：*

- **PDF 合并 (Merge PDFs)**：自定义拖拽排序合并多个文档为单一高质 PDF。支持合并前缩略图实时预览与页面汇总，处理后可一键将成果无缝接力至压缩或加密等后续步骤。
- **页面整理与旋转 (Organize & Rotate)**：可视化网格工作台，支持 Shift / 框选连续多选、自由拖拽重排、90°/180° 顺时针旋转、单页或批量删除。支持在任意位置插入标准 A4 空白页（带多语言动态水印）或追加外部文件，配备 30 步无损撤销/重做（Undo/Redo）历史栈与「仅导出所选页」即时切片提取。
- **页面拆分与提取 (Split & Extract)**：大文档精准切片导出。提供 4 种独立模式：*提取为单个文件*（提取选定单页或 `1-3, 5, 8-end` 范围）、*全单页炸裂*（一键切分成 N 个独立单页文件）、*固定步长拆分*（如每 2 页切为一份）与*多区间自定义分段*。支持一键整册打包为 ZIP 或导出独立 PDF。
- **智能多模压缩 (Smart Compress)**：最高压缩 90% 体积。内置 4 档精细模式：*均衡模式 (300 DPI)* 兼顾画质与体积；*极限模式 (150 DPI)* 极限瘦身适合邮件附件；*无损对象流压缩* 纯净精简内部结构；以及**目标体积智能逼近**（输入硬性指标如 ≤ 2MB，纯本地二分搜索算法自动微调清晰度逼近上限）。全模式均受通用防膨胀体积护栏保护。
- **水印与安全防伪 (Watermark & Protect)**：高 DPI 透明 Canvas 水印压印引擎。支持多语言排版、自定义字号、不透明度、倾斜角度（-90° 至 90°）、平铺或单点居中印压、快捷印章色（印章红、商务蓝等）与 Hex 色值自定义，支持在压印完成后直接连带配置所有者权限加密锁。
- **动态页码编排 (Dynamic Page Numbering)**：专业级文档统一页码规整。支持灵活宏表达式（`{n}`、`{total}`、`Page {n} of {total}`、`第 {n} 页 共 {total} 页`）、6 大页眉/页脚对齐锚点、奇偶页镜像翻转、跳过首页封面（第 2 页起码为 1）。独创**旧页码白底遮罩覆盖**（整行色带或局部小框），支持画布智能吸色匹配背景底色，彻底遮蔽原有错乱页码。
- **电子签名与盖章 (Sign & Stamp)**：专为严肃公文与合同签署打造。支持手绘手写签名、输入文字生成签名、本地印章与签名照片上传。自研盒式低通平整算法自动去除近景拍摄阴影与纸张白底，支持原色/墨黑/深蓝/公章红重着色。支持一键将简签（Initials）批量盖印至全部页面、偶数页、奇数页或末页，配备 LocalStorage 离线印章库与预设位置。
- **PDF 转图片 (PDF to Image)**：逐页将 PDF 渲染为清晰 PNG 或 JPG 图像。支持*标准 150 DPI* 与*印刷级 300 DPI* 超清画质。可在页面缩略图上直接单页下载预览，亦可一键将全册所有页面完整打包为 ZIP 归档。
- **图片转 PDF (Image to PDF)**：将 PNG、JPG、WebP、BMP 等图片快速批量拼版合成为多页 PDF。提供标准 A4 统一画幅（支持纵横自适应与等比居中排版）以及原图比例自适应贴合模式，满足票据报销拼版与证件扫描归档。
- **加密与权限保护 (Protect & Encrypt)**：现代高强度 AES-256 原生算法加密。支持设置**打开密码 (User Password)** 限制未授权查阅，同时支持设置**所有者管理密码 (Owner Password)** 细粒度锁定操作权限（严禁未授权打印、禁止复制文本与图像、禁止表单修改与批注），确保外发合同机密安全。
- **解密与解除限制 (Unlock & Strip Restrictions)**：永久剥离密码保护与操作权限限制。输入正确密码后，底层引擎重构文档对象流，永久清除加密字典及打印、复制、编辑权限锁，输出一份完全自由干净的明文 PDF。
- **深度元数据清理 (Deep Metadata Sanitizer)**：政企合规与涉密文档必选的隐私净化工具。深入扫描并彻底擦除 PDF 内部隐藏的所有敏感指纹：文档标题、作者名称、制作机构、编辑软件（Word / WPS / Acrobat 等指纹）、创建与修改时间戳、相机 GPS 地理坐标、私有应用字典（PieceInfo）以及内嵌缩略图缓存，100% 杜绝痕迹泄漏。
- **海豹收纳箱 / 本地隐私保险库 (Local Privacy Vault)**：设备专属的离线文档收纳与归档中心。基于浏览器原生 IndexedDB 事务存储，零网络外发。结合 Web Crypto SubtleCrypto SHA-256 算法实现内容指纹比对与重复检测，支持网格卡片与详细列表自由切换、各工具处理后一键直存或自动保存、以及随时调用历史文档快速继续接力处理。

> 💡 **统一三步走极速交付架构 (Three-Stage Delivery Architecture)**：全部 12 款核心交互处理工具统一重构为「① 上传文件 → ② 参数配置与处理 → ③ 交付成果」极速流，提供处理前后体积比对徽章、无缝全屏预览、一键重下、「返回调整」保留当前配置、以及多工具下一步接力（如压缩完直接加密、加水印后直接整理）。

---

### ⚡ 自动化流水线与批量处理

*将多个独立 PDF 操作串联为一键执行的自动化流水线：*

- **久经考验的预设流程**：
  - 📁 **招投标与涉密文档预处理**：深度元数据清理 → 均衡压缩 → 防泄漏水印。
  - 🧾 **报销票据自动打包**：多图转 A4 PDF → 按报销门户要求压缩体积。
  - 📑 **合同批量盖章与归档**：权限解锁 → 末页签名盖章 → 安全水印。
- **可视化拖拽流水线编辑器**：
  - 重新排序、配置参数、增删步骤，实时节点兼容性端口校验。
  - 多文件批量执行，逐步进度跟踪，支持取消与宏任务平滑调度。
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
- **国际化**：Vue I18n（完整支持 🇺🇸 英语、🇩🇪 德语、🇪🇸 西班牙语、🇫🇷 法语、🇨🇳 简体中文）
- **本地存储**：IndexedDB 结构化事务存储（海豹收纳箱）
- **调度性能**：Event Loop 宏任务平滑分片（Active Event Loop Yielding，防长耗时计算卡顿）
- **测试体系**：[Vitest](https://vitest.dev/) + [Puppeteer](https://pptr.dev/)（**28 个算法与单元测试套件，137 项用例 100% 通过**，配合无头浏览器端到端 E2E 回归套件）

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

# 5. 运行真实无头浏览器端到端 E2E 回归测试
npm run test:e2e

# 6. 生产构建（生成 PWA Service Worker）
npm run build
```

### 🐳 Docker 一键自建

```bash
# 使用 Docker Compose 一键启动（访问 http://localhost:8080）
docker compose up -d
```


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
