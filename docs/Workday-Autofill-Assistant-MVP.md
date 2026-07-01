# Workday Autofill Assistant MVP 需求文档

## 1. 项目背景

很多求职者在使用 Workday 申请职位时，会遇到重复填写体验差的问题。即使已经上传了简历，用户仍然经常需要手动填写姓名、联系方式、地址、工作经历、教育经历、求职资格问题等信息。

由于不同公司的 Workday 实例彼此独立，求职者无法在一个公司填写后复用到另一个公司。这导致用户在大量投递时花费大量时间在低价值、重复性的表单填写上。

本项目希望通过 Chrome 插件的形式，帮助求职者维护一份本地求职 Profile，并在 Workday 申请页面中自动或半自动填写常见字段，从而降低重复填写成本。

---

## 2. 产品定位

**Workday Autofill Assistant** 是一个面向求职者的 Chrome 插件，帮助用户在 Workday 求职申请页面中自动填写重复信息，并保存申请记录。

MVP 阶段重点解决：

* 基础信息重复填写
* 工作经历重复填写
* 教育经历重复填写
* 常见求职问题答案复用
* 当前申请记录保存

MVP 不做批量申请，不自动提交申请，不替用户绕过平台流程。

---

## 3. 目标用户

### 3.1 核心用户

正在积极求职、需要频繁填写 Workday 申请表的求职者。

典型用户包括：

* 被裁员后正在大量投递岗位的人
* New grad / Intern 求职者
* 转行求职者
* 移民求职者
* 软件工程师、产品经理、数据分析师等需要频繁在线申请的白领岗位求职者

### 3.2 用户痛点

1. Workday 每家公司都要重新注册或填写申请表。
2. 上传简历后，解析结果经常不准确。
3. 工作经历、教育经历、地址、电话等信息反复填写。
4. 常见问题每次都要重复回答。
5. 投递职位多了以后，用户很难追踪自己申请过哪些岗位。
6. 用户担心隐私，不希望求职资料上传到陌生服务器。

---

## 4. MVP 目标

### 4.1 产品目标

让用户在 Workday 申请页面中，能够通过一次点击完成大部分重复字段填写。

### 4.2 可衡量目标

MVP 成功标准：

* 用户可以在插件中创建并保存一份求职 Profile。
* 插件可以在 Workday 页面识别并填写常见基础字段。
* 插件可以填写至少一段工作经历和一段教育经历。
* 用户可以维护常见问题答案库。
* 用户可以一键保存当前申请记录。
* 用户数据默认保存在本地，不依赖后端。

### 4.3 非目标

MVP 阶段不包含：

* 自动提交申请
* 批量海投
* 自动生成完整简历
* 自动生成 cover letter
* 多设备云同步
* 团队协作
* 支持所有 ATS 平台
* 完整 AI 匹配分析
* 后台账号系统
* 支付系统

---

## 5. 核心用户流程

### 5.1 首次使用流程

1. 用户安装 Chrome 插件。
2. 用户打开插件 options page。
3. 用户填写个人基础信息。
4. 用户添加工作经历。
5. 用户添加教育经历。
6. 用户添加常见问题答案。
7. 用户保存 Profile。
8. 用户进入 Workday 申请页面。
9. 用户点击插件中的 “Autofill”。
10. 插件识别页面字段并自动填写。
11. 用户检查填写结果。
12. 用户手动提交申请。

### 5.2 日常使用流程

1. 用户打开一个 Workday 职位申请页面。
2. 插件检测到当前页面属于 Workday。
3. 用户点击插件图标。
4. 插件显示当前页面可执行操作：

   * Autofill current page
   * Save application
   * Open profile
5. 用户点击 Autofill。
6. 插件填写当前页面字段。
7. 用户进入下一步页面后，可再次点击 Autofill。
8. 用户完成申请后点击 Save application。
9. 插件保存职位、公司、链接、日期等信息。

---

## 6. 功能需求

## 6.1 用户 Profile 管理

### 6.1.1 基础信息

用户可以在插件 options page 中维护以下信息：

* First name
* Last name
* Preferred name
* Email
* Phone number
* Country
* Address line 1
* Address line 2
* City
* Province / State
* Postal code / ZIP code
* LinkedIn URL
* GitHub URL
* Portfolio / personal website
* Work authorization status
* Sponsorship requirement
* Earliest start date

### 6.1.2 工作经历

用户可以添加多段工作经历。

每段工作经历包含：

* Company name
* Job title
* Location
* Start month
* Start year
* End month
* End year
* Currently working here
* Description / responsibilities

MVP 至少支持 3 段工作经历。

### 6.1.3 教育经历

用户可以添加多段教育经历。

每段教育经历包含：

* School name
* Degree
* Field of study
* Location
* Start year
* End year
* GPA，可选
* Description，可选

MVP 至少支持 2 段教育经历。

### 6.1.4 常见问题答案库

用户可以维护常见问题的默认答案。

MVP 支持以下问题类型：

* Are you legally authorized to work in this country?
* Will you now or in the future require sponsorship?
* Are you willing to relocate?
* Are you willing to work remotely / hybrid / onsite?
* Desired salary / compensation expectation
* Notice period / earliest start date
* How many years of experience do you have with X?
* Why are you interested in this role?

对于敏感问题，例如性别、族裔、残障、退伍军人身份，MVP 默认不自动填写，只允许用户手动选择是否保存默认答案。

---

## 6.2 Workday 页面检测

插件需要识别当前页面是否为 Workday 申请页面。

### 6.2.1 检测规则

满足以下任一条件时，可判断为 Workday 页面：

* URL 包含 `myworkdayjobs.com`
* 页面中存在 Workday 相关 DOM 标识
* 页面标题或 HTML 中包含 Workday application 相关文本

### 6.2.2 页面状态

插件 popup 中需要显示当前页面状态：

* Workday page detected
* No Workday page detected
* Autofill available
* No supported fields found

---

## 6.3 表单字段识别

插件需要在当前页面中扫描可填写字段，并尝试匹配用户 Profile 中的数据。

### 6.3.1 支持字段类型

MVP 支持以下 HTML 表单类型：

* text input
* email input
* tel input
* textarea
* select dropdown
* checkbox
* radio button

### 6.3.2 字段匹配方式

插件需要综合以下信息判断字段含义：

* label text
* aria-label
* placeholder
* input name
* input id
* nearby text
* section heading
* question text

例如：

* `First Name` → firstName
* `Given Name` → firstName
* `Last Name` → lastName
* `Family Name` → lastName
* `Email Address` → email
* `Phone Number` → phone
* `LinkedIn Profile` → linkedinUrl
* `Postal Code` → postalCode

### 6.3.3 字段匹配置信度

每个字段匹配结果应包含一个 confidence score。

MVP 可简单分为：

* High confidence：自动填写
* Medium confidence：建议填写，可由用户确认
* Low confidence：不填写

---

## 6.4 自动填写

### 6.4.1 基础信息自动填写

用户点击 Autofill 后，插件应自动填写当前页面中可识别的基础信息字段。

填写后需要触发对应的 DOM event，确保 Workday 前端状态更新，例如：

* input event
* change event
* blur event

### 6.4.2 工作经历填写

插件应支持填写工作经历相关字段。

MVP 可采用半自动方式：

* 插件识别当前是否处于 Work Experience section。
* 如果页面已有空白经历表单，插件填写第一段或下一段工作经历。
* 如果页面需要点击 “Add” 按钮新增经历，MVP 可以提示用户手动点击 Add 后再执行 Autofill。
* 每次 Autofill 默认填写尚未填入的下一段经历。

### 6.4.3 教育经历填写

插件应支持填写教育经历相关字段。

MVP 可采用与工作经历相同的半自动方式：

* 识别 Education section。
* 填写当前空白教育经历表单。
* 如需新增条目，由用户手动点击 Add。
* 插件不强行自动新增复杂动态表单。

### 6.4.4 常见问题填写

插件应识别常见问题，并根据用户答案库进行填写。

例如：

* “Are you legally authorized to work in Canada?” → Yes / No
* “Will you now or in the future require sponsorship?” → Yes / No
* “What is your desired salary?” → 用户保存的薪资答案

对于开放性问题，插件可以填入用户预设答案，但不在 MVP 中调用 AI 生成。

---

## 6.5 敏感信息处理

### 6.5.1 敏感字段定义

以下字段属于敏感字段：

* Gender
* Race / ethnicity
* Disability status
* Veteran status
* Date of birth
* SIN / SSN / national ID
* Criminal history
* Health-related information

### 6.5.2 MVP 处理规则

* 默认不自动填写敏感字段。
* 当插件识别到敏感字段时，可以高亮或提示用户手动检查。
* 如果用户明确在设置中开启某一类敏感字段自动填写，才允许自动填写。
* MVP 不保存 SIN / SSN / national ID。
* MVP 不保存完整生日，除非后续版本有明确需求和隐私设计。

---

## 6.6 申请记录保存

用户可以一键保存当前申请记录。

### 6.6.1 自动提取信息

插件尝试从当前页面提取：

* Company name
* Job title
* Job location
* Job URL
* Application date
* Source platform：Workday
* Status：Applied / Draft / Interested

### 6.6.2 用户可编辑信息

用户可以手动编辑：

* Company name
* Job title
* Status
* Notes
* Resume version
* Cover letter version

### 6.6.3 申请记录列表

插件 options page 中提供简单的申请记录列表。

列表字段：

* Date
* Company
* Job title
* Status
* URL
* Notes

MVP 不需要复杂看板，只需要表格列表即可。

---

## 6.7 数据存储

### 6.7.1 本地存储

MVP 默认使用 Chrome extension storage 保存用户数据。

优先考虑：

* `chrome.storage.local`

可选：

* `chrome.storage.sync`，但需注意容量限制。

### 6.7.2 数据不上传

MVP 不设置后端服务器，用户数据默认只保存在本地浏览器中。

### 6.7.3 导入 / 导出

MVP 可支持 JSON 导入导出，方便用户备份数据。

导出内容包括：

* Profile
* Work experience
* Education
* Answer bank
* Application records

---

## 7. 权限需求

Chrome 插件需要申请以下权限：

* `storage`：保存用户 Profile 和申请记录
* `activeTab`：在用户主动点击插件时访问当前页面
* `scripting`：向当前页面注入 content script
* host permissions：限制为 Workday 相关域名，例如 `*://*.myworkdayjobs.com/*`

MVP 应避免申请过宽权限，例如访问所有网站。

---

## 8. 用户界面需求

## 8.1 Popup

用户点击 Chrome 插件图标后，显示 popup。

Popup 内容包括：

* 当前页面状态
* Autofill current page 按钮
* Save application 按钮
* Open profile/settings 按钮
* 最近一次填写结果摘要

示例状态：

* Detected 8 supported fields.
* Filled 6 fields.
* 2 fields require review.
* Sensitive fields skipped.

---

## 8.2 Options Page

Options page 用于管理用户数据。

页面模块：

1. Personal info
2. Work experience
3. Education
4. Answer bank
5. Application records
6. Import / Export
7. Privacy settings

---

## 8.3 页面内提示

MVP 可以提供轻量页面内提示。

例如：

* 成功填写字段后短暂高亮
* 跳过敏感字段时显示提示
* 无法识别字段时不干扰用户

页面内 UI 要尽量轻，不遮挡 Workday 原有申请流程。

---

## 9. 隐私与安全要求

### 9.1 隐私原则

* 默认本地存储
* 不上传用户求职信息
* 不自动提交申请
* 不采集用户申请内容
* 不保存高敏感身份信息
* 用户可随时导出和删除本地数据

### 9.2 用户提示

首次使用时需要明确说明：

* 插件会在 Workday 页面中读取表单字段，用于匹配和填写信息。
* 用户资料默认保存在本地浏览器中。
* 插件不会自动提交申请。
* 用户需要在提交前自行检查所有填写内容。

---

## 10. 技术方案概览

### 10.1 插件结构

```text
Chrome Extension
├── manifest.json
├── popup
│   ├── Popup UI
│   └── Current page actions
├── options
│   ├── Profile management
│   ├── Answer bank
│   └── Application records
├── content script
│   ├── Workday page detector
│   ├── Field scanner
│   ├── Field matcher
│   └── Autofill executor
└── storage layer
    ├── Profile storage
    ├── Answer bank storage
    └── Application records storage
```

### 10.2 核心模块

#### Page Detector

负责判断当前页面是否为 Workday 页面。

#### Field Scanner

负责扫描当前页面中的 input、textarea、select、checkbox、radio 等字段。

#### Field Matcher

负责根据 label、placeholder、aria-label、附近文本等信息，将页面字段映射到用户 Profile 字段。

#### Autofill Executor

负责将数据写入字段，并触发 input/change/blur 等事件。

#### Application Tracker

负责提取并保存当前职位申请记录。

---

## 11. MVP 验收标准

### 11.1 Profile

* 用户可以创建、编辑、保存个人基础信息。
* 用户可以添加、编辑、删除工作经历。
* 用户可以添加、编辑、删除教育经历。
* 用户可以添加、编辑、删除常见问题答案。

### 11.2 Workday 检测

* 用户进入 Workday 申请页面时，插件能识别当前页面。
* 非 Workday 页面中，插件不会执行 Autofill。

### 11.3 Autofill

* 插件可以填写基础信息字段。
* 插件可以填写 email、phone、address、LinkedIn 等常见字段。
* 插件可以填写至少一组工作经历。
* 插件可以填写至少一组教育经历。
* 插件可以填写常见 yes/no 问题。
* 插件不会自动提交申请。

### 11.4 安全

* 插件默认不填写敏感字段。
* 插件不保存 SIN / SSN / national ID。
* 用户数据默认保存在本地。
* 用户可以删除本地数据。

### 11.5 Application Records

* 用户可以保存当前申请记录。
* 用户可以在 options page 查看申请记录。
* 用户可以编辑申请状态和备注。

---

## 12. 边界情况

### 12.1 Workday 字段识别失败

如果插件无法识别字段：

* 不填写该字段。
* 可在结果摘要中显示 “Some fields were skipped.”
* 不阻塞用户继续申请。

### 12.2 字段匹配不确定

如果字段匹配置信度中等：

* MVP 可以选择不自动填写。
* 后续版本可增加用户确认弹窗。

### 12.3 页面动态加载

Workday 页面可能异步渲染字段。

MVP 需要支持：

* 用户点击 Autofill 时重新扫描页面。
* 简单 MutationObserver 监听页面变化。
* 不需要完全自动跨步骤运行。

### 12.4 多段经历

如果 Workday 页面需要用户点击 Add experience：

* MVP 不自动点击 Add。
* 插件提示用户手动添加下一段经历后再点击 Autofill。

---

## 13. 后续版本方向

MVP 之后可以考虑：

1. 支持 Greenhouse、Lever、iCIMS、Ashby。
2. AI 分析 JD 与简历匹配度。
3. 根据 JD 推荐简历关键词。
4. 根据岗位生成 tailored answers。
5. 支持多份 Profile。
6. 支持不同国家申请规则。
7. 支持云同步。
8. 支持 resume version tracking。
9. 支持申请进度看板。
10. 支持从 LinkedIn / Indeed 自动保存职位。
11. 支持用户手动训练字段匹配规则。
12. 支持浏览器侧加密存储。

---

## 14. 风险与限制

### 14.1 技术风险

Workday 页面结构复杂，不同公司配置不同，字段识别准确率可能有限。

应对方式：

* 从最常见字段开始支持。
* 保持半自动模式。
* 不做自动提交。
* 为用户提供填写结果摘要。

### 14.2 隐私风险

用户资料包含大量个人信息。

应对方式：

* 本地存储优先。
* 不设置默认后端。
* 不保存极高敏感信息。
* 明确隐私说明。
* 限制插件访问域名。

### 14.3 平台合规风险

如果插件被设计成批量自动申请工具，可能违反平台使用规则。

应对方式：

* 不自动提交。
* 不批量申请。
* 用户主动触发 Autofill。
* 产品定位为个人填写辅助工具，而不是申请机器人。

---

## 15. 推荐 MVP 范围总结

MVP 只做五件事：

1. 用户本地 Profile 管理。
2. Workday 页面检测。
3. 基础字段 Autofill。
4. 工作经历 / 教育经历半自动填写。
5. 申请记录保存。

一句话目标：

帮助求职者在 Workday 申请中减少重复填写时间，但最终检查和提交仍由用户自己完成。
