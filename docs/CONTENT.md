# 内容与素材维护

核心词表为 Ogden Basic English 的 850 个唯一词条，编排为 170 课，每课 5 词。每个词包含一个核心含义、中文释义、情境或系统表情图示、英文例句、中文解释、辅助词、选择题选项以及静态音频。

## 来源与许可

| 素材 | 实际来源与记录 |
| --- | --- |
| 固定词表 | [Wiktionary Basic English list](https://en.wiktionary.org/w/index.php?title=Appendix:Basic_English_word_list&oldid=87681413)，CC BY-SA 4.0；`source-words.json` 保存词条与类别 |
| 教学文字 | 项目使用 AI 辅助编写，数据按 CC BY-SA 4.0 提供；四份 TSV 与 `support.json` 为编辑源文件 |
| 发音 | [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) 本机生成；模型、音色、下载地址与哈希见 `audio-model.json` |
| 图示 | 用户系统的 Unicode 表情字形；没有捆绑第三方图片 |

以上 JSON 和 TSV 均在 `content/`。`attributions.json` 保存作者、固定来源版本、许可和修改说明，家长页显示对应署名。`audio-manifest.json` 保存每个文件的文本、生成设置、哈希、时长和审听状态。模型不随网站发布，最终 MP3 在 `public/assets/audio/`。

## 修改文字

四份 UTF-8 TSV 的列为：单词、中文核心义、英文例句、中文例句、Unicode 图示。最后一列可以为空；保留末尾制表符。辅助词及词形由 `support.json` 解释。

```sh
python -X utf8 scripts/build-content.py
npm run content:prepare
npm run content:check -- --text-only
```

编译器生成 `content/words.json`，开发和构建命令生成精简的浏览器文件。修改词义或例句后，必须重新生成对应音频。修改稳定 ID、编排或内容版本前，先设计已有进度的兼容方式。

每词只教授一个核心含义；词性、句子、图示与干扰项应一致。Ogden 范围还限制词义与词性，例如 `like` 的动词“喜欢”是扩展用法。必要的表外词、变体和词形在句子中解释，不计入 850 的学习进度。句子应自然、短小、适龄，优先复用已学词和句型。

## 重新制作声音

需要 Python 3.12；生成环境和模型放在忽略的 `.cache/`，中间文件与错误日志放在 `tmp/`。

```powershell
python -m venv .cache/audio
.cache/audio/Scripts/python -m pip install -r scripts/audio-requirements.txt
.cache/audio/Scripts/python -X utf8 scripts/download-audio-model.py
.cache/audio/Scripts/python -X utf8 scripts/generate-audio.py
.cache/audio/Scripts/python -X utf8 scripts/verify-audio.py
npm run content:check
```

当前使用：英语为 Kokoro v1.0 int8 的 `af_heart`；普通话为高质量自然语音合成（默认音色为温暖女声 `zh-CN-XiaoxiaoNeural`，备选音色为活泼童声 `zh-CN-YunxiaNeural`，存放在 `public/assets/audio/yunxia/`）。家长设置中可自由切换音色。逐文件生成，按文本、设置和哈希跳过未修改内容；网络失败采用有上限的重试，错误记录在项目目录中。`lead`、`wind`、`record` 等英文多读音词按当前含义设置音素覆盖。

音频包含 850×3 段单词、例句和中文释义（含双音色），10 段操作提示（含双音色）及 313 段辅助词，共 3,733 个音频文件。自动检查验证覆盖、文本对应、哈希、解码、静音和时长。

## 发布前人工检查

逐词核对核心含义、翻译、例句自然度、辅助词和选择题；逐段审听首尾完整性、读音、重音、停顿及语速。完成家长陪同的儿童试用，并验证真实手机键盘与下载行为。

只有实际完成审校才更新批准记录。`npm run content:check -- --release` 检查文字、声音和儿童试用三项批准；自动文件检查不能替代人工审校。
