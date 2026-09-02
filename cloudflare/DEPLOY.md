# 🦭 PDFSeal - Cloudflare R2 + Worker 零知识加密外发中转部署指南

## 一、 费用与容量风控说明（100% 免费安全锁）

Cloudflare 针对个人开发者提供了极度慷慨的**永久免费额度**，并通过三道硬防线保证绝对 0 扣费：

| 机制 | 阈值标准 | 触发动作 |
| :--- | :--- | :--- |
| **单文件体积限制** | $\le$ 10 MB | 超过 10 MB 拒绝接收，杜绝超大文件挤占 |
| **高水位极速周转** | $\ge$ 85% (8.5 GB) | 自动将有效时长强制锁定为 10 分钟，加速文件销毁释放 |
| **饱和熔断保护** | $\ge$ 95% (9.5 GB) | 提示存储池饱和，暂停接收新文件 |
| **绝对物理写入阻断** | $\ge$ 99% (9.9 GB) | **Worker 绝对禁止向 R2 写入任何字节**，从根本上锁死免费额度 |

---

## 二、 部署步骤：Cloudflare 网页控制台（3分钟搞定）

### 第 1 步：创建 R2 存储桶
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 在左侧菜单点击 **R2 对象存储 (R2 Object Storage)**。
3. 点击 **「创建存储桶 (Create Bucket)」**，输入名称 `pdfseal-bucket`，位置选择「自动」，点击创建。
4. **（可选推荐）设置对象自动销毁规则（Lifecycle Rule）**：
   - 进入 `pdfseal-bucket` -> 点击 **「设置 (Settings)」** -> **「对象生命周期规则 (Object Lifecycle Rules)」**。
   - 添加规则：设置 **“在创建 3 天或 7 天后删除对象”**，提供底层的存储自动回收双保险。

### 第 2 步：创建 KV 命名空间
1. 在左侧菜单点击 **Workers 和 Pages** -> **KV**。
2. 点击 **「创建命名空间 (Create Namespace)」**，输入名称 `pdfseal-kv`，点击添加。

### 第 3 步：创建并部署 Worker
1. 在左侧菜单点击 **Workers 和 Pages** -> 点击 **「创建 (Create application)」** -> **「创建 Worker」**。
2. 名称可填 `pdfseal-send`，点击 **「部署 (Deploy)」**。
3. 点击 **「编辑代码 (Edit Code)」**：
   - 将项目内 `cloudflare/worker.js` 的完整代码全部复制粘贴进去，覆盖原有内容。
   - 点击右上角 **「保存并部署 (Save and deploy)」**。

### 第 4 步：绑定 R2 和 KV（核心关键）
1. 在当前 Worker 的详情页面，点击 **「设置 (Settings)」** -> **「变量和机密 (Variables and Secrets)」**（或 **Bindings / 绑定**）。
2. **添加 R2 存储桶绑定**：
   - 类型选择：`R2 Bucket`
   - 变量名称 (Variable Name)：**必须严格填写** `PDFSEAL_BUCKET`
   - 存储桶 (Bucket)：选择刚才创建的 `pdfseal-bucket`
3. **添加 KV 命名空间绑定**：
   - 类型选择：`KV Namespace`
   - 变量名称 (Variable Name)：**必须严格填写** `PDFSEAL_KV`
   - 命名空间 (KV Namespace)：选择刚才创建的 `pdfseal-kv`
4. 点击 **「部署 (Deploy / Save)」** 保存绑定。

---

## 三、 在 PDFSeal 中启用您的专属 Worker

1. 部署完成后，在 Worker 页面顶部复制分配给您的专属域名（例如 `https://pdfseal-send.yourname.workers.dev`）。
2. 打开您的 PDFSeal 网站，点击右上角的 **「⚙️ 全局设置」**。
3. 滚动到最下方的 **「5. 加密外发中转端点」**：
   - 在「自定义 Cloudflare Worker URL」输入框中粘贴您的 Worker 域名。
4. 点击完成。
