import type { Word } from '../data/types'
import { AudioButton } from './AudioButton'
import { AppleIllustration } from './BookIllustration'

export function WordCard({ word, sentence = true, language = 'zh-CN' }: { word: Word; sentence?: boolean; language?: 'zh-CN' | 'en' }) {
  return <div className="word-card">
    {word.illustration ? <div className="word-illustration" role="img" aria-label={word.meaning} lang="zh-CN">{word.id === 'ogden-apple' ? <AppleIllustration/> : word.illustration}</div> : <div className="context-scene" lang="zh-CN"><p>{word.context}</p></div>}
    <h2 className="english-word" lang="en">{word.word}</h2>
    <p className="word-meaning" lang="zh-CN">{word.meaning}</p>
    <AudioButton src={word.audio.word} label={language === 'en' ? 'Listen' : '听单词'} language={language}/>
    {sentence && <Sentence word={word} language={language}/>}
  </div>
}

export function Sentence({ word, language = 'zh-CN' }: { word: Word; language?: 'zh-CN' | 'en' }) {
  return <div className="sentence-block">
    <AudioButton src={word.audio.sentence} label={language === 'en' ? `Play sentence: ${word.sentence}` : `播放例句：${word.sentence}`} text={word.sentence} variant="sentence" language={language}/>
    <p className="translation" lang="zh-CN">{word.sentenceZh}</p>
    {word.support.length > 0 && <details className="support"><summary>{language === 'en' ? 'Sentence helpers' : '句子里的小帮手'}</summary><dl>{word.support.map(item => <div key={item.word}><dt lang="en">{item.word}</dt><dd lang="zh-CN">{item.meaning}</dd><AudioButton src={item.audio} label={language === 'en' ? `Listen to ${item.word}` : `听辅助词 ${item.word}`} variant="icon" language={language}/></div>)}</dl></details>}
  </div>
}
