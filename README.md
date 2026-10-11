# 拆喜盒 Gift Maker

拆喜盒是一个面向个性化纸艺礼物的 AI 创作工具。用户上传四张人物照片后，系统生成统一风格的 Q 版人物素材，并在浏览器内完成包装盒排版，最终导出可印刷、裁切和折叠的 4 页 A3 矢量 PDF。

项目能力介绍见 [拆喜盒-项目与能力介绍.pdf](./拆喜盒-项目与能力介绍.pdf)。

## 核心能力

- **AI 角色生成**：以四张参考图生成严格 2x2 的角色板，统一人物风格、镜头与光照。
- **图像处理链路**：调用人像背景移除服务，使用 Sharp 切分并校验四张透明 PNG。
- **可视化编辑器**：支持主题、字体、文字、素材、人物位置、缩放和旋转的实时编辑，包含撤销、重做和草稿自动保存。
- **纸艺印刷输出**：基于 SVG 描述包装盒展开结构，导出横向 A3 矢量 PDF，并在导出前将文本转为路径。
- **异步任务架构**：Web 函数负责访问控制、任务编排和草稿读写；任务函数负责模型调用和图片处理；TOS 保存图片与任务状态。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite、React Router、Zustand |
| 画布与导出 | SVG、react-moveable、jsPDF、svg2pdf.js、opentype.js |
| 图像生成与处理 | Ark Seedream、AI MediaKit、Sharp |
| 服务端 | Node.js、veFaaS、TOS S3 兼容 API |
| 质量保障 | TypeScript、Vitest、Oxlint |

## 架构

```text
React Web
  ├─ 上传四张照片 / 编辑包装盒 / 导出 A3 PDF
  └─ 轮询任务状态、保存草稿
          │
          ▼
veFaaS Web 函数
  ├─ 邀请码与设备校验
  ├─ 生成 TOS 预签名上传地址
  └─ 创建、查询和恢复任务
          │
          ▼
veFaaS 任务函数
  ├─ Seedream 生成 2x2 角色板
  ├─ AI MediaKit 去除人物背景
  └─ Sharp 拆分 4 张透明 PNG
          │
          ▼
TOS 私有桶
  └─ 原图、角色图、任务状态、草稿与配额 JSON
```

## 本地运行

### 前端

```bash
npm install
npm run dev
```

默认开发地址为 `http://localhost:5173`。未配置 `VITE_API_BASE_URL` 时，前端使用本地模拟任务状态，便于体验上传、生成反馈和编辑工作台。

### 服务端

服务端代码位于 [`server/`](./server)，用于部署至 veFaaS：

```bash
npm install --prefix server
cp server/.env.example server/.env
```

将实际密钥配置在 veFaaS 环境变量中，不要提交 `.env` 文件。部署前的云资源、函数配置和权限要求见 [`server/P0_SETUP.md`](./server/P0_SETUP.md)。

## 质量检查

```bash
npm run lint
npm test
npm run build
```

## 项目结构

```text
src/
  pages/              页面流程：上传、生成、确认、工作台、导出结果
  features/editor/    包装盒编辑器与素材系统
  features/template/  SVG 展开图、日历面、PDF 导出
  features/task/      任务 API、状态轮询与草稿持久化
server/
  web/                Web 函数：静态站点与 REST API
  generator/          异步生成函数：生图、抠图和切图
docs-images/          项目能力介绍中的真实界面截图
```

## 安全与数据处理

- API 密钥、TOS 密钥和邀请码仅存放于函数环境变量。
- 浏览器使用 TOS 预签名 URL 直传图片，不经 Web 函数中转。
- 任务访问同时校验邀请码和设备 ID。
- TOS 桶应保持私有，并为原图、生成图与任务记录配置生命周期清理规则。
