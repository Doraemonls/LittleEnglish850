# Little English 850

面向中文母语儿童的基础英语网站：从单词开始，以词卡、辨认、听音拼写和间隔复习学习 850 个核心词。

当前阶段：**V1 开发准备完成，应用尚未搭建。**

| 阅读顺序 | 文档 |
| --- | --- |
| 1. 产品范围、规则与发布验收 | [PROJECT.md](PROJECT.md) |
| 2. 页面、状态与交互 | [UX 设计](docs/ux/UX_DESIGN.md) · [六页图稿 PDF](docs/ux/wireframes.pdf) |
| 3. 技术方案、最小数据结构与开发任务 | [开发实施说明](docs/IMPLEMENTATION.md) |
| 4. 词库、例句、音频和素材来源 | [内容与素材规范](docs/CONTENT.md) |

默认开发方案：React + TypeScript + Vite、普通 CSS、浏览器 localStorage、静态音频与词库、TSV 导出。第一批工作是固定源词表、准备 20 个代表词，并实现一课 5 词的完整学习与续学流程。

图稿的 SVG 为可编辑源文件，PNG 用于文档预览，PDF 用于整套查看。三种格式应同步更新。产品规则集中维护在 PROJECT.md，其余文档分别补充实现、内容和交互细节。
