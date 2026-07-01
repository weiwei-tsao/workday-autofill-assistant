# Workday Autofill Assistant - Implementation Plan

本文档基于 [`Workday-Autofill-Assistant-MVP.md`](./Workday-Autofill-Assistant-MVP.md) 的需求，给出 MVP 阶段的技术实现方案、目录结构、数据模型、模块划分与开发阶段规划。

---

## 1. 技术栈决策

| 决策项 | 选择 | 说明 |
|---|---|---|
| 插件形态 | Manifest V3 | Chrome 官方要求，Side Panel API 依赖 MV3 |
| 主交互界面 | **Side Panel**（`chrome.sidePanel`） | 常驻不因失焦关闭，适配多步骤 Workday 表单反复 Autofill 的流程；点击插件图标直接打开 side panel（不做独立 popup） |
| UI 框架 | **React 18 + TypeScript** | Side Panel / Options 共用组件与类型 |
| 构建工具 | **Vite + `@crxjs/vite-plugin`** | 成熟的 MV3 打包方案，支持 HMR |
| 样式 | **Tailwind CSS** | 开发效率优先，插件体积可控 |
| 表单 | **react-hook-form + zod** | Profile / 经历 / 问答库均为多字段表单，需要校验 |
| Content script | **纯 TypeScript（无框架）** | 避免与 Workday 自身前端运行时冲突；页面内提示用 Shadow DOM 隔离样式 |
| 状态同步 | `chrome.storage.local` + `chrome.storage.onChanged` 自定义 hook | 不引入 Redux/Zustand，MVP 阶段没必要 |
| 单元测试 | **Vitest** | 覆盖 storage repository、field matcher 纯逻辑 |

---

## 2. 项目目录结构

```text
workday-autofill-assistant/
├── docs/
│   ├── Workday-Autofill-Assistant-MVP.md
│   └── implementation.md
├── public/
│   └── icons/                      # 16/32/48/128 图标
├── src/
│   ├── manifest.ts                 # crxjs manifest 配置（TS 定义，构建期生成 manifest.json）
│   ├── background/
│   │   └── service-worker.ts       # 协调 content script 与 side panel 的消息中枢
│   ├── content/
│   │   ├── index.ts                # content script 入口，装配以下模块
│   │   ├── detector.ts             # Page Detector
│   │   ├── scanner.ts              # Field Scanner
│   │   ├── matcher.ts              # Field Matcher（含 confidence scoring）
│   │   ├── field-dictionary.ts     # 字段语义词典（label/pattern → canonical key）
│   │   ├── executor.ts             # Autofill Executor（写值 + 派发事件）
│   │   ├── observer.ts             # MutationObserver，处理动态渲染
│   │   └── inline-ui.ts            # Shadow DOM 内的高亮/提示 UI
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/             # PageStatus, ActionButtons, ResultSummary
│   ├── options/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── pages/
│   │       ├── PersonalInfoPage.tsx
│   │       ├── WorkExperiencePage.tsx
│   │       ├── EducationPage.tsx
│   │       ├── AnswerBankPage.tsx
│   │       ├── ApplicationRecordsPage.tsx
│   │       ├── ImportExportPage.tsx
│   │       └── PrivacySettingsPage.tsx
│   ├── shared/
│   │   ├── types/                  # Profile / WorkExperience / Education / AnswerBank / ApplicationRecord / FieldMatch
│   │   ├── storage/                # storage repository（对 chrome.storage.local 的封装）
│   │   ├── constants/              # 敏感字段清单、confidence 阈值等
│   │   ├── messaging/              # content ⇄ background ⇄ sidepanel 的类型化消息通道
│   │   └── ui/                     # 跨界面复用的 React 组件
│   └── styles/
│       └── tailwind.css
├── tests/
│   ├── matcher.test.ts
│   ├── storage.test.ts
│   └── fixtures/                   # 模拟 Workday DOM 结构的静态 HTML fixture
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── .gitignore
```

---

## 3. 数据模型（`src/shared/types`）

```ts
interface Profile {
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  workAuthorizationStatus: string;
  sponsorshipRequired: boolean;
  earliestStartDate?: string; // ISO date
}

interface WorkExperience {
  id: string;
  companyName: string;
  jobTitle: string;
  location?: string;
  startMonth: number;
  startYear: number;
  endMonth?: number;
  endYear?: number;
  currentlyWorking: boolean;
  description?: string;
}

interface Education {
  id: string;
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  location?: string;
  startYear: number;
  endYear?: number;
  gpa?: string;
  description?: string;
}

type AnswerType = "yesNo" | "text" | "select";

interface AnswerBankEntry {
  id: string;
  questionKey: string;       // 如 "workAuthorization" / "sponsorship" / "relocate" / "desiredSalary"
  questionLabel: string;
  type: AnswerType;
  value: string;
  isSensitive: boolean;
  autoFillEnabled: boolean;  // 敏感问题默认 false
}

type ApplicationStatus = "Draft" | "Interested" | "Applied";

interface ApplicationRecord {
  id: string;
  companyName: string;
  jobTitle: string;
  jobLocation?: string;
  jobUrl: string;
  applicationDate: string;   // ISO date
  sourcePlatform: "Workday";
  status: ApplicationStatus;
  notes?: string;
  resumeVersion?: string;
  coverLetterVersion?: string;
}
```

存储 key 规划（`chrome.storage.local`）：`profile`、`workExperiences`、`educations`、`answerBank`、`applicationRecords`、`privacySettings`（敏感字段自动填写开关）。

---

## 4. 模块设计

### 4.1 Storage Repository（`shared/storage`）

- 对每种实体提供 `get / set / add / update / remove` 的类型化方法，内部统一走 `chrome.storage.local`。
- 提供 `useStorage<T>(key)` React hook：初始读取 + 监听 `chrome.storage.onChanged`，供 Side Panel / Options 页面响应式使用。
- 提供 `exportAll()` / `importAll(json)` 用于 §6.7.3 的导入导出。

### 4.2 Background Service Worker

- 维护每个 tab 的最近一次 Autofill 结果摘要（供 Side Panel 展示）。
- 转发 content script → side panel 的消息（`FIELD_SCAN_RESULT`、`AUTOFILL_RESULT`）。
- 处理 `chrome.action.onClicked` 绑定 `sidePanel.open()`（`openPanelOnActionClick: true`）。
- 处理 `chrome.tabs.onUpdated`，在 Workday 域名下启用 side panel，其他站点禁用（对应 host permissions 限制）。

### 4.3 Content Script

**Page Detector (`detector.ts`)**
- 判断 `location.hostname` 是否匹配 `*.myworkdayjobs.com`，辅以 DOM 特征（如 `[data-automation-id]` 属性，Workday 页面广泛使用）兜底。
- 检测结果通过 message 上报给 background/side panel。

**Field Scanner (`scanner.ts`)**
- 遍历当前文档（含常见的 iframe，如需要）中的 `input[type=text|email|tel]`、`textarea`、`select`、`input[type=checkbox]`、`input[type=radio]`。
- 对每个字段抽取上下文：关联 `<label>`、`aria-label`、`aria-labelledby`、`placeholder`、`name`、`id`、最近的文本节点、所属 section heading（向上查找 `role=group` / heading 元素）。

**Field Matcher (`matcher.ts` + `field-dictionary.ts`)**
- 字段词典：canonical key（如 `firstName`）→ 多组同义 pattern（字符串/正则），如 `First Name`、`Given Name`。
- 打分策略（加权信号，见第 5 节），输出 `{ canonicalKey, confidence: number, level: "high"|"medium"|"low" }`。
- 敏感字段（§6.5.1）单独打标 `isSensitive`，即使匹配成功也默认不自动填。

**Autofill Executor (`executor.ts`)**
- 按 `high` confidence 结果写值；`medium` 结果收集后交由 Side Panel 展示待确认列表（MVP 可先仅做展示，不做确认弹窗，符合 §12.2 "后续版本增加确认弹窗"）。
- 写值后依次派发 `input` → `change` → `blur` 事件（`bubbles: true`），兼容 Workday 前端框架的状态同步。
- 工作经历/教育经历：识别当前 section 内第一个"空白"表单块，按 §6.4.2/6.4.3 的半自动策略只填当前块，不代点 "Add"。

**Observer (`observer.ts`)**
- 轻量 `MutationObserver` 监听表单容器变化，用于 Side Panel 点击 Autofill 时触发重新扫描；不做全自动跨步骤运行。

**Inline UI (`inline-ui.ts`)**
- 用 Shadow DOM 挂载轻量提示（填写成功高亮、敏感字段跳过提示），样式与宿主页面隔离。

### 4.4 Side Panel

- 展示当前页面状态（Workday detected / Autofill available / No supported fields）。
- 操作按钮：Autofill current page / Save application / Open profile（跳转 Options）。
- 展示最近一次填写结果摘要（Detected N / Filled N / M fields require review / Sensitive skipped）。

### 4.5 Options Page

七个模块页面，与需求 §8.2 一一对应：Personal info / Work experience / Education / Answer bank / Application records / Import-Export / Privacy settings。均为标准 CRUD 表单 + 列表（Application records 用简单表格，不做看板）。

---

## 5. Field Matching 打分策略

采用多信号加权评分，MVP 先用固定权重（后续版本可调优/引入用户反馈校正）：

| 信号 | 权重 | 说明 |
|---|---|---|
| 精确匹配 `<label>` 文本 | 40 | 与词典中某 canonical key 的某个 pattern 完全匹配（忽略大小写/空格） |
| `aria-label` / `aria-labelledby` 精确匹配 | 35 | |
| `name` / `id` 属性包含关键字 | 25 | 如 `id="firstName"`、`name="legalName--firstName"` |
| `placeholder` 匹配 | 20 | |
| 附近文本节点模糊匹配 | 15 | 编辑距离或包含关系 |
| section heading 辅助加权 | +10 | 若字段所在 section heading 命中 "Work Experience" / "Education"，对应类别字段加分，减少跨类别误匹配（如 "Location" 出现在个人信息和工作经历中） |

阈值：`score >= 60` → high；`30 <= score < 60` → medium；`< 30` → low（不填）。阈值作为常量放在 `shared/constants`，便于后续调优。

---

## 6. 权限与 Manifest 要点

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "scripting", "sidePanel"],
  "host_permissions": ["*://*.myworkdayjobs.com/*"],
  "side_panel": { "default_path": "src/sidepanel/index.html" },
  "background": { "service_worker": "src/background/service-worker.ts", "type": "module" },
  "content_scripts": [
    {
      "matches": ["*://*.myworkdayjobs.com/*"],
      "js": ["src/content/index.ts"]
    }
  ],
  "options_page": "src/options/index.html"
}
```

不申请 `<all_urls>` 或 `tabs`，符合需求 §7 最小权限原则。

---

## 7. 开发阶段规划

| 阶段 | 目标 | 主要产出 |
|---|---|---|
| Phase 0 | 项目脚手架 | Vite + CRXJS + React + Tailwind 初始化，manifest 骨架，storage repository 骨架，可加载空插件 |
| Phase 1 | Profile 数据管理 | Options 页：Personal info / Work experience / Education / Answer bank 的增删改查，数据落地 `chrome.storage.local` |
| Phase 2 | 页面检测 + Side Panel 骨架 | Page Detector 上线，Side Panel 展示页面状态，background 消息通道打通 |
| Phase 3 | Field Scanner + Matcher | 基础字段（text/email/tel/textarea/select）扫描与打分，先用 fixture HTML 做单元测试验证准确率 |
| Phase 4 | 基础信息 Autofill | Autofill Executor 写值 + 事件派发，Side Panel 填写结果摘要 |
| Phase 5 | 工作经历 / 教育经历半自动填写 | §6.4.2 / §6.4.3 半自动逻辑，MutationObserver 重扫描 |
| Phase 6 | 常见问题 + 敏感字段处理 | Answer bank 匹配填写 yes/no 与文本问题；敏感字段默认跳过 + 高亮提示 + Privacy settings 开关 |
| Phase 7 | 申请记录保存 | Application Tracker 提取信息，Side Panel "Save application"，Options 记录列表 |
| Phase 8 | 导入导出 + 页面内提示打磨 | JSON import/export，Shadow DOM inline UI 完善 |
| Phase 9 | 边界情况与打磨 | §12 各类边界情况回归（识别失败、动态加载、多段经历提示） |
| Phase 10 | 测试与打包 | Vitest 覆盖核心逻辑，手动跨公司 Workday 实例验证，打包发布素材 |

每个 Phase 完成后可独立加载插件验证，不要求线性阻塞，Phase 3-4 与 Phase 1 可并行推进。

---

## 8. 测试策略

- **单元测试（Vitest）**：Field Matcher 打分逻辑、Storage repository 读写、Field dictionary 覆盖度，使用 `tests/fixtures/*.html` 模拟不同公司 Workday DOM 结构。
- **手动测试**：在真实 Workday 申请页面（至少 2-3 家不同公司实例，因各公司 Workday 配置差异较大）验证检测、扫描、填写、事件触发是否被 Workday 前端正确识别。
- **回归清单**：对照需求 §11 MVP 验收标准逐条验证。

---

## 9. 风险对应措施（落到实现层面）

- **字段识别准确率有限**（§14.1）→ Field Matcher 先覆盖高频字段，medium/low confidence 一律不自动填，避免误填造成用户信任问题。
- **隐私风险**（§14.2）→ 敏感字段清单在 `shared/constants` 中硬编码并默认关闭，Options 的 Privacy settings 页面是唯一开启入口；不引入任何网络请求（无 `fetch`/`XMLHttpRequest` 调用远程服务器）。
- **合规风险**（§14.3）→ Autofill Executor 不触发表单提交相关的 click（不点击 Submit/Next 按钮），仅填充字段本身。
