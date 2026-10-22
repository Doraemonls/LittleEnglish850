# Little English 850

面向中文母语儿童和英语初学者的静态英语学习网站。项目以 Ogden Basic English 的 850 个核心词为范围，通过词卡、听辨、拼写、例句和间隔复习建立基础词汇。

当前版本：**0.1.0-rc.2**。应用不需要后端、账号或运行时 API 密钥；学习记录保存在当前浏览器。

> 发布状态：代码与自动验证已接入，逐词人工审校、音频审听和儿童试用仍需完成。自动检查不能替代这些发布前人工验收。

## 当前功能

- **完整课程**：850 个唯一核心词，固定编排为 170 课，每课 5 词。
- **新词学习**：按 `Word card → Meaning → Listen → Spell → Sentence` 学习；学习操作使用简短英语，中文仅用于词义、情境和例句翻译。
- **练习反馈**：听音步骤自动播放目标词；选择题与整词拼写支持重试，正确后自动进入下一题；已会单词可安全跳过并安排后续复习。
- **间隔复习**：新词次日开始复习，独立通过后按 3、7、30 天推进；每轮最多复习 10 词，错误或查看答案会安排次日再练。
- **自动续学**：正式课程或复习按步骤保存，可在刷新或重新打开后继续；多标签页冲突和损坏数据会阻止静默覆盖。
- **词语书**：支持英文或中文搜索、学习状态和课程筛选、课程浏览、词卡详情、发音和单词自由练习。
- **家长设置**：展示学习状态、累计学习和待复习数量；提供音量、中文引导音色、使用说明和 UTF-8 TSV 进度导出。
- **多设备界面**：适配手机、平板和桌面，支持触屏键盘、实体键盘、键盘导航和读屏语义。
- **静态部署**：React 单页应用使用 hash 路由和相对资源路径，可部署到 GitHub Pages 等静态 HTTPS 主机。

## 技术栈

- React 19 + TypeScript
- Vite 7
- Vitest（领域与存储测试）
- Playwright + axe-core（桌面、移动端和无障碍浏览器测试）
- 浏览器 `localStorage`（无服务端数据库）

## 开始开发

### 环境要求

- 推荐 Node.js **24**（项目版本见 `.node-version`）
- 最低支持 Node.js **22.12**
- npm（随 Node.js 安装）

普通界面开发和生产构建不需要 Python、语音模型或 API 密钥。只有重新编译教学源内容或生成音频时才需要 Python。

### 首次运行

在项目根目录执行：

```sh
npm ci
npm run dev
```

Vite 默认在 `http://127.0.0.1:5173/` 启动。`predev` 会先从作者词库生成浏览器使用的精简数据。

需要运行端到端测试时，再安装浏览器：

```sh
npx playwright install chromium firefox webkit
```

Linux CI 或全新 Linux 开发机可使用 `npx playwright install --with-deps chromium firefox webkit`。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 生成精简词库并启动开发服务器 |
| `npm run content:prepare` | 在已运行的开发服务器中修改词库后，重新生成浏览器数据 |
| `npm run typecheck` | 运行 TypeScript 静态检查 |
| `npm run lint` | 运行 ESLint |
| `npm test` | 运行学习流程、复习、存储、恢复和导出单元测试 |
| `npm run content:check` | 检查 850 词内容、音频文件、哈希和来源记录 |
| `npm run content:check -- --text-only` | 只检查文字内容，适合内容编辑中的快速反馈 |
| `npm run build` | 生成词库、类型检查并构建 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run test:e2e` | 运行 Chromium、Firefox、WebKit 和移动 WebKit 测试 |

应用代码改动提交前，至少运行：

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

界面、交互、路由、音频或存储行为改动还应运行：

```sh
npm run test:e2e
```

内容改动还应运行 `npm run content:check`。`npm run content:check -- --release` 会额外要求真实的文字审校、音频审听和儿童试用批准；不要为了通过检查而修改批准记录。

## 开发约定

- 应用代码位于 `src/`，领域规则集中在 `src/domain/`，浏览器存储和导出位于 `src/services/`。
- 作者内容位于 `content/`；最终静态音频位于 `public/assets/audio/`。
- 不要直接编辑 `src/data/words.generated.json` 或 `src/data/words.source.generated.json`。它们由 `npm run content:prepare` 生成并被 Git 忽略。
- 修改稳定词 ID、固定顺序或 `contentVersion` 前，必须先提供兼容迁移，避免使已有浏览器进度失效。
- 学习页的导航、步骤、操作和反馈使用英语；中文只用于词义、情境和例句翻译。首页、词语书和家长设置使用中文。
- 一个正式课程或复习会话保存在 `localStorage`；自由练习是临时状态，不应改变正式复习日期。
- 涉及手机输入时，应同时验证 Playwright 移动视口和真实手机键盘；浏览器模拟不能替代真机检查。

## 修改教学内容

四份 UTF-8 TSV 和 `content/support.json` 是教学文字的编辑源。修改后执行：

```sh
python -X utf8 scripts/build-content.py
npm run content:prepare
npm run content:check -- --text-only
```

修改词义或例句后还需要重新生成并审听对应音频。完整的音频环境、逐文件生成、重试和验证步骤见[内容与素材维护](docs/CONTENT.md)。

## 生产构建与验证

```sh
npm run build
npm run preview
```

生产文件输出到 `dist/`。要按 GitHub Pages 子目录 `/LittleEnglish850/` 验证生产构建，可在 PowerShell 中执行：

```powershell
npm run build
$env:PLAYWRIGHT_PRODUCTION = '1'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_PRODUCTION
```

GitHub Actions 会在 `main`、`release/**`、标签和拉取请求上运行完整验证。通过验证的 `main` 构建会发布到 GitHub Pages；其他分支和拉取请求只生成测试结果与构建产物。

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `src/app/` | 应用外壳、路由、状态连接和全局样式 |
| `src/pages/` | 首页、学习页、词语书、家长设置和关于页 |
| `src/components/` | 可复用界面与音频组件 |
| `src/domain/` | 会话状态机、进度和间隔复习规则 |
| `src/services/` | 本地存储、音频播放和 TSV 导出 |
| `content/` | 词表、教学源数据、来源、许可和音频清单 |
| `public/assets/audio/` | 随网站发布的静态音频 |
| `scripts/` | 内容编译、音频生成和验证脚本 |
| `tests/` | Vitest 单元测试与 Playwright 端到端测试 |
| `docs/` | 开发、内容、性能和 UX 设计文档 |

## 数据与隐私

进度使用键 `little-english-850` 保存在当前来源的浏览器 `localStorage` 中。项目不上传学习数据，也没有账号同步：

- 清除站点数据会清除进度。
- 不同浏览器、设备、域名或从 localhost 切换到正式网站时，进度不会自动迁移。
- 家长页可导出完整的 UTF-8 TSV 记录，用于留存或人工对照；当前不支持导入。

## 项目资料

- [产品规则与验收](PROJECT.md)
- [页面交互与设计图](docs/ux/UX_DESIGN.md)
- [开发、生产验证与发布](docs/DEVELOPMENT.md)
- [内容来源与素材维护](docs/CONTENT.md)
- [性能评审](docs/PERFORMANCE_REVIEW_2026-10-20.md)
- [版本记录](CHANGELOG.md)

词表、教学数据和音频的来源与许可记录在 `content/attributions.json`，网站家长页也提供署名和源数据链接。
