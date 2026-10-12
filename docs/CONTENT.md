# Little English 850｜内容与素材规范

版本：1.0 · 日期：2026-10-10 · 来源核对日期：2026-10-10

用于制作 [V1 产品](../PROJECT.md) 的固定词库、中文释义、儿童例句、图像和声音。内容制作顺序：**核对词表 → 审定文字 → 生成声音与图片 → 逐词审校 → 静态发布**。

## 1. 内容交付

| 内容 | 要求 |
| --- | --- |
| 核心词表 | 恰好 850 个唯一词条，固定来源版本、稳定 ID、标准拼写、核心词义与词性 |
| 课程编排 | 170 课，每课 5 词；先熟悉的物品和动作，再关系、功能与抽象词 |
| 每词词卡 | 英文、中文核心释义、单词音频、图片或情境及替代文字 |
| 每词例句 | 至少一个自然短句，配中文解释与完整句音频，说明必要的辅助词与词形 |
| 选择题 | 两种意义选择题各 2–3 项，正确项和干扰项含义清楚，图片 / 中文语音说明与选项对应 |
| 操作语音 | 中文题目说明、关键操作、反馈和示范的固定音频 |
| 来源清单 | 每份引用素材的源链接、作者、许可和版本、修改说明；生成音频记录模型 / 音色 / 版本与审听结果 |

正式词条类型、检查器和固定源词表由 D01 建立；先完整制作第一课 5 词，并选 15 个代表词验证长词、功能词、抽象词、相近意义与多读音。

## 2. 词义与词形

- 每词只教授一个核心含义；中文解释由人审定，不能自动采用公开词典的第一个释义。
- `books`、`is`、`went` 分别归入 `book`、`be`、`go`；词形与拼写变体不增加 850 的分母。
- 核对固定源拼写，说明灰色 `grey` 等变体关系；实际拼写练习使用该版本选定的标准形式。
- 核心操作动词为 `be, have, do, come, go, get, give, keep, let, make, put, seem, take, say, see, send`，另有 `may`、`will`。
- Ogden 范围同时限制词义与词性。`like` 的性质词用法、`drink` 的名词用法属于核心范围；“喜欢”“喝”等动词用法作为扩展明确标记。
- 数字、日期、人名和必要表外词作为辅助内容，提供中文与音频解释，不增加核心进度。

## 3. 例句与句型

从第一课起把词放进短句。每课尽量复用同一结构，逐步引入新句型；优先使用已学词，必要的新词有解释。具体词结合图片，动作、关系和抽象词结合生活情境。

| 阶段 | 表达用途 | 句型示例 |
| --- | --- | --- |
| 认识与描述 | 辨认事物 | This is an apple. |
| 认识与描述 | 状态与特征 | I am happy. / The box is small. |
| 认识与描述 | 拥有与归属 | I have a red ball. / This is my book. |
| 认识与描述 | 位置 | The cat is under the table. |
| 认识与描述 | 某处有什么 | There are books on the shelf. |
| 动作与问答 | 日常动作 | I go to school every day. |
| 动作与问答 | 指令与请求 | Put the ball in the box. / May I have some water, please? |
| 动作与问答 | 否定 | I do not have a pencil. |
| 动作与问答 | 提问与回应 | Do you have a pencil? — Yes, I do. / Where is my bag? — It is on the bed. |
| 时间与连句 | 正在发生 | I am putting the book on the table. |
| 时间与连句 | 过去 | We made a cake. |
| 时间与连句 | 将来 | We will make a cake. |
| 时间与连句 | 比较 | This box is smaller than that box. |
| 时间与连句 | 连接与原因 | I have a cat and she has a dog. / I am happy because my friend is here. |

这些是句型示例；制作实际课程时逐词核对核心范围与辅助词，不能直接认为示例的全部词都属于固定词表。例句用于听读和跟读，拼写仍以当前核心单词为单位。家长可配合听指令、换词、问答和看图描述。

## 4. 音频与图片默认方案

**英语声音优先用 Kokoro 在素材制作电脑上生成。** 固定一种美式音色，先试听 `af_heart` 等候选；确认语速、清晰度和停顿后生成 WAV 母版，再转成网页使用的 MP3。网页直接播放最终文件。中文操作提示和选项说明也准备固定录音，可用普通话 TTS 并人工审听。

审听检查单词首尾是否完整、读音与当前词性 / 含义是否一致、句子重音与停顿是否自然。`wind`、`record` 等可能多读音的词逐项核对。每个新课词至少有单词与例句两段音频，操作提示可共用。听题音频准备失败时保持题目未完成。

具体词图片优先用 OpenMoji 或许可清楚的 Commons 图片，关系和抽象词用自制简明情境。图与中文含义一致；选择题图片的替代说明不能在听音或拼写题中暴露英文答案。

素材处理逐条进行，UTF-8 文件读写；遇到可重试的网络错误采用有上限的指数退避，失败写入项目内 `tmp/content-errors.log`，完成后统一核对遗漏。只有审校通过的素材进入正式目录。

## 5. 已核对的免费来源

| 来源 | 用途与授权 | 本项目用法 |
| --- | --- | --- |
| [Wiktionary 850 词表](https://en.wiktionary.org/wiki/Appendix:Basic_English_word_list) | 核心词条和类别；正文采用 CC BY-SA 等许可 | 固定来源版本，核对全部词条；教学顺序自行编排 |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | 模型卡标注 Apache-2.0，本机生成无按次 API 费用 | 首选英语音频制作工具；[代码许可](https://github.com/hexgrad/kokoro/blob/main/LICENSE)和[音色清单](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)随选型记录 |
| [Wiktionary / Kaikki](https://kaikki.org/dictionary/rawdata.html) | 词义、译词、音标的结构化数据，沿用来源许可 | 提取目标词的候选信息，人工选义；[许可说明](https://kaikki.org/dictionary/) |
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) | 汉英词典，CC BY-SA 4.0 | 辅助反查与核对，不直接当作儿童英汉词表 |
| [Tatoeba](https://tatoeba.org/en/downloads) | 英中句对，文本通常 CC BY 2.0 FR，部分 CC0；录音另有许可 | 优先筛选合适文本，人工审校后统一生成声音 |
| [OpenMoji](https://openmoji.org/) | SVG / PNG 图片，[CC BY-SA 4.0](https://github.com/hfg-gmuend/openmoji/blob/master/LICENSE.txt) | 具体事物的简洁词卡插图 |
| [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) | 真人录音与图片，逐文件许可 | 用于补充素材，保存作者和对应文件许可 |
| [Free Dictionary API](https://dictionaryapi.dev/) | 免费英文释义 / 音标 / 部分发音接口；内容按各自来源许可 | 制作时辅助查阅，不能假设 850 词、中文和美式录音均完整 |

备用音频方案是 [Azure Speech](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/)：核查时 F0 神经语音额度为每月 50 万字符，需要账户、可用区域与相应资源，使用按服务条款执行。850 词加 850 个短句粗估约 49,300 字符，实际以文本和计费规则为准。使用时在制作环境保存密钥，网页只发布生成的音频。开始使用前复核[额度和限制](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits)。

[浏览器 SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) 可用于早期原型，设备声音不一致，没有标准的音频文件导出方法；[localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) 可区分本地与远程声音。正式素材统一按文件发布。

本次研究没有确认到一套完整提供 Ogden 850、儿童中文释义、统一美式音频和分级例句且可整套直接发布的素材包。以上来源用于组合制作。

## 6. 授权与内容验收

素材来源、作者、许可链接、取得版本与修改说明存入静态来源清单，发布时展示所需署名。CC BY-SA 素材的改编遵守相同方式共享条款；素材和软件代码分别管理。可免费查阅的教材或官网内容，使用前仍需核对具体复用授权。

Tatoeba 文本与录音的许可分别处理；[下载说明](https://tatoeba.org/en/downloads)指出音频许可字段为空时，不允许假定可在项目外使用。[使用条款](https://tatoeba.org/en/terms_of_use)也不保证翻译和录音经过专业审校。维基词典引用的外部文本和媒体按[对应许可](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)核对。

| 检查 | 完成条件 |
| --- | --- |
| 全量覆盖 | 与固定源词表一一对应，850 个唯一 ID、170×5 编排；变体和词形对应正确 |
| 教学含义 | 核心词义、词性、中文、图像、选择题正确项与例句一致 |
| 句型难度 | 自然、适龄；新结构和辅助词有解释，扩展用法已标明 |
| 声音 | 每词与句子音频存在并人工审听，读音、重音、停顿和图文一致 |
| 文件 | 素材 URL 可读取，替代说明完整，选项 ID 唯一且正确项存在 |
| 来源 | 引用素材许可清楚，来源清单完整，必要署名可随站点发布 |

规则背景参考 Ogden 原著 [The System](https://web.archive.org/web/20200608021512/http://ogden.basic-english.org/be2.html) 与 [Teaching and Learning](https://web.archive.org/web/20200806121938/http://ogden.basic-english.org/be4.html)。当前规范为开发依据；完整词库、实际音色和最终素材仍需按 [D01–D07](IMPLEMENTATION.md#5-实施顺序)制作验证。
