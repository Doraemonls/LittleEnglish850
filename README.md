# Little English 850

面向中文母语儿童和英语初学者的静态学习网站。从 Ogden 的 850 个核心词开始，通过词卡、听音、拼写和间隔复习学习英语。

当前版本：**0.1.0-rc.1**，发布准备中。包含 170 课、词语书、家长设置、TSV 学习记录导出与中英双语关于页。进度保存在当前浏览器的 localStorage。

## 本地运行

使用 Node.js 24（最低 22.12）：

```sh
npm ci
npm run dev
```

## 检查与构建

```sh
npm run lint
npm test
npm run content:check
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

生产文件在 `dist/`，可用于 GitHub Pages。开发和构建会自动生成精简词库；声音按需加载。普通构建不需要 Python、模型或 API 密钥。

`release/v0.1.0` 保存发布准备代码，`v0.1.0-rc.1` 标记候选版本。GitHub Actions 验证代码和生产构建，并保存可下载的网站文件；该流程不会启用或部署公共网站。人工文字审校、音频审听和儿童试用完成后，再启用正式发布。

## 项目资料

- [产品规则与验收](PROJECT.md)
- [页面交互与设计图](docs/ux/UX_DESIGN.md)
- [开发、生产验证与发布](docs/DEVELOPMENT.md)
- [内容来源与素材维护](docs/CONTENT.md)
- [版本记录](CHANGELOG.md)

词表与教学数据的来源和许可见 `content/attributions.json`，网站家长页也提供署名与源数据链接。清除浏览器数据会清除进度；不同设备或域名各自保存记录。TSV 用于查看进度。
