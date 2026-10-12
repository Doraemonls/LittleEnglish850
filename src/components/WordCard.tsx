import type { Word } from '../data/types'
import { AudioButton } from './AudioButton'

export function WordCard({ word, sentence = true }: { word: Word; sentence?: boolean }) {
  return <div className="word-card">
    {word.illustration ? <div className="word-illustration" role="img" aria-label={word.meaning}>{word.illustration}</div> : <div className="context-scene"><p>{word.context}</p></div>}
    <h2 className="english-word" lang="en">{word.word}</h2>
    <p className="word-meaning">{word.meaning}</p>
    <AudioButton src={word.audio.word}/>
    {sentence && <Sentence word={word}/>}
  </div>
}

export function Sentence({ word }: { word: Word }) {
  return <div className="sentence-block">
    <p className="english-sentence" lang="en">{word.sentence}</p>
    <p className="translation">{word.sentenceZh}</p>
    <AudioButton src={word.audio.sentence} label="听句子"/>
    {word.support.length > 0 && <details className="support"><summary>句子里的小帮手</summary><dl>{word.support.map(item => <div key={item.word}><dt lang="en">{item.word}</dt><dd>{item.meaning}</dd><AudioButton src={item.audio} label={`听辅助词 ${item.word}`}/></div>)}</dl></details>}
  </div>
}
