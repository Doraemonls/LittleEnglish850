import { Icon } from '../components/Icon'

const copy = {
  'zh-CN': {
    title: '关于小小英语',
    back: '家长设置',
    languageLabel: '页面语言',
    sections: [
      {
        title: '850 个词的由来',
        text: '1930 年，英国学者 C. K. Ogden（奥格登）出版《Basic English》，介绍了一套以 850 个核心词为基础的精简英语体系，希望帮助更多人用英语交流。小小英语以这份词表为起点，搭配中文释义、发音和简短例句。',
      },
      {
        title: '从小小的一步开始',
        text: '850 个词给初学者一个清晰、有限的起点。家长可以陪孩子听词、认意思、拼写，再把词放进句子里；成人初学者也可以按自己的节奏练习。随着阅读和兴趣增加，再逐步扩展词汇。',
      },
      {
        title: '有了 AI，学习依然有意义',
        text: 'AI 可以帮助翻译、解释和练习。学会英语，能让我们更直接地阅读原文、提出问题，也更有能力判断 AI 的回答。每认识一个新词，就多了一条探索世界、与人交流的路。',
      },
    ],
    slogan: ['AI 让答案更近，', '学习让世界更大。'],
    sourcesLabel: '延伸阅读',
    historyLink: 'Basic English 简史',
    wordListLink: 'Ogden 850 词表',
  },
  en: {
    title: 'About Little English',
    back: 'Parent settings',
    languageLabel: 'Page language',
    sections: [
      {
        title: 'Where the 850 words began',
        text: 'In 1930, British scholar C. K. Ogden published Basic English. It described a simplified form of English built around 850 core words, to help more people communicate. Little English uses that word list as a starting point, with Chinese meanings, audio and short example sentences.',
      },
      {
        title: 'A small first step',
        text: 'These 850 words give beginners a small, clear place to start. Parents can listen, explore meanings and practise spelling with their children, then use the words in sentences. Adults can learn at their own pace, too. Grow your vocabulary as your interests and reading grow.',
      },
      {
        title: 'Learning still matters with AI',
        text: 'AI can help us translate, explain and practise. Learning English helps us read original texts, ask our own questions and judge AI’s answers. Each new word gives us another way to explore the world and connect with people.',
      },
    ],
    slogan: ['AI brings answers closer.', 'Learning opens up your world.'],
    sourcesLabel: 'Further reading',
    historyLink: 'A history of Basic English',
    wordListLink: 'Ogden’s 850-word list',
  },
}

export function About({ language }: { language: 'zh-CN' | 'en' }) {
  const content = copy[language]
  return <main className="about page" id="main" lang={language}>
    <div className="about-toolbar">
      <a className="text-button" href="#/parent"><Icon name="back"/>{content.back}</a>
      <nav className="language-switch" aria-label={content.languageLabel}>
        <a href="#/about" hrefLang="zh-CN" lang="zh-CN" aria-current={language === 'zh-CN' ? 'page' : undefined}>中文</a>
        <a href="#/about/en" hrefLang="en" lang="en" aria-current={language === 'en' ? 'page' : undefined}>English</a>
      </nav>
    </div>
    <article className="about-article" aria-labelledby="about-title">
      <p className="about-slogan">{content.slogan.map(line => <span key={line}>{line}</span>)}</p>
      <h1 id="about-title">{content.title}</h1>
      {content.sections.map(section => <section className="about-section" key={section.title}>
        <h2>{section.title}</h2>
        <p>{section.text}</p>
      </section>)}
      <nav className="about-sources" aria-label={content.sourcesLabel}>
        <a href="https://en.wikipedia.org/wiki/Basic_English" target="_blank" rel="noreferrer">{content.historyLink}</a>
        <a href="https://en.wiktionary.org/wiki/Appendix:Basic_English_word_list" target="_blank" rel="noreferrer">{content.wordListLink}</a>
      </nav>
    </article>
  </main>
}
