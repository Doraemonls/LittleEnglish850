import { useEffect, useState } from 'react'
import { useApp, store } from '../app/store'
import { navigate } from '../app/router'
import { getWord } from '../data/catalog'
import type { Session } from '../data/types'
import { createSession, isQuiz, stepSession, type ExerciseAction } from '../domain/session'
import { dueWords, localDay, nextLesson } from '../domain/progress'
import { audioPlayer } from '../services/audio'
import { Icon } from '../components/Icon'
import { WordCard, Sentence } from '../components/WordCard'
import { AudioButton } from '../components/AudioButton'
import { SpellingInput } from '../components/SpellingInput'
import { Dialog } from '../components/Dialog'
import { Onboarding } from '../components/Onboarding'

const titles = { read: '这个词是什么意思？', listen: '你听到的是哪一个？', spell: '听一听，拼出来', sentence: '读一句话' }

function Exercise({ session, dispatch, onExit }: { session: Session; dispatch: (action: ExerciseAction) => void; onExit: () => void }) {
  const { state, status } = useApp()
  const [paused, setPaused] = useState(false)
  const word = getWord(session.wordIds[session.index])
  const question = session.question
  const done = isQuiz(question) && session.flags[question].done
  useEffect(() => {
    if (state.settings.spokenGuidance) audioPlayer.play(`assets/audio/prompt-${question}.mp3`, state.settings.volume)
    return () => audioPlayer.stop()
    // Guidance runs once per question, not on every saved letter or volume update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.index, question])
  useEffect(() => {
    if (session.feedback && state.settings.spokenGuidance) audioPlayer.play(`assets/audio/prompt-${session.feedback}.mp3`, state.settings.volume)
    // Feedback changes on an answer; saved input changes do not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.feedback])
  const pause = () => { audioPlayer.stop(); setPaused(true) }
  const hint = (open: boolean) => { audioPlayer.stop(); dispatch({ type: 'hint', open }) }
  const label = session.mode === 'lesson' ? `第 ${session.lessonId} 课` : session.mode === 'review' ? '复习一下' : '自由练习'
  return <main className="learn page" id="main">
    <div className="exercise-nav"><span>{label}<span className="round-progress">{session.index + 1} / {session.wordIds.length}</span></span><button className="text-button" onClick={pause}><Icon name="pause"/>{session.mode === 'practice' ? '离开' : '暂停'}</button></div>
    <div className="step-dots" role="img" aria-label={`本词当前步骤：${question === 'card' ? '词卡' : question === 'read' ? '看词选意思' : question === 'listen' ? '听音选意思' : question === 'spell' ? '听音拼写' : '句中听读'}`}>
      {(session.mode === 'review' ? ['spell', 'listen', 'read', 'sentence'] : ['card', 'read', 'listen', 'spell', 'sentence']).map(q => <i key={q} className={q === question ? 'current' : ''}/>)}
    </div>
    <section className={`exercise-panel ${question === 'card' ? 'card-panel' : ''}`}>
      {question !== 'card' && <h1 className="question-title">{titles[question]}</h1>}
      {question === 'card' && <WordCard word={word}/>}
      {question === 'sentence' && <><div className="sentence-word" lang="en">{word.word}</div><Sentence word={word}/></>}
      {question === 'read' && <p className="question-word" lang="en">{word.word}</p>}
      {(question === 'spell' || question === 'listen') && <AudioButton large src={word.audio.word} label={session.heard ? '再听一次' : '听单词'} onFinished={() => dispatch({ type: 'heard' })}/>}
      {(question === 'read' || question === 'listen') && <>
        <div className="choices">{session.choices[question].map(id => {
          const choice = getWord(id)
          return <div className={`choice-row ${done && id === word.id ? 'chosen' : ''}`} key={id}>
            <button className="choice" disabled={done || (question === 'listen' && !session.heard)} onClick={() => { audioPlayer.stop(); dispatch({ type: 'answer', choice: id }) }}>
              {choice.illustration && <span className="choice-picture" aria-hidden="true">{choice.illustration}</span>}<span>{choice.meaning}</span>{done && id === word.id && <Icon name="check"/>}
            </button>
            <AudioButton src={choice.audio.meaning} label={`听选项：${choice.meaning}`}/>
          </div>
        })}</div>
      </>}
      {question === 'spell' && <SpellingInput key={word.id} answer={word.word} session={session} onEdit={edit => dispatch({ type: 'spell', edit })}/>}
      <div className={`answer-feedback ${session.feedback === 'correct' ? 'success' : ''}`} role="status" aria-live="polite">
        {session.feedback === 'correct' ? <><Icon name="check"/>答对了</> : session.feedback === 'retry' ? (question === 'spell' ? '重新拼一遍' : '再想一想') : session.feedback === 'letters' ? '请逐个输入英文字母' : null}
      </div>
      {(!isQuiz(question) || done) && <button className="button primary full continue-button" onClick={() => { audioPlayer.stop(); dispatch({ type: 'next' }) }}>{question === 'card' ? '试一试' : question === 'sentence' ? session.index === session.wordIds.length - 1 ? '完成这一轮' : '下一个词' : '继续'}<Icon name="arrow"/></button>}
      {isQuiz(question) && !done && <button className="text-button hint-button" onClick={() => hint(true)}><Icon name="bulb"/>看一下提示</button>}
    </section>
    {session.hintOpen && <Dialog title="词卡提示" onClose={() => hint(false)}><div className="dialog-top"><h2>词卡提示</h2><button className="icon-button" aria-label="关闭提示" onClick={() => hint(false)}><Icon name="close"/></button></div><WordCard word={word}/><button className="button primary full" onClick={() => hint(false)}>收起提示</button></Dialog>}
    {paused && <Dialog title="暂停练习" onClose={() => setPaused(false)}><h2>已暂停</h2>{session.mode !== 'practice' && <p>{status === 'saved' ? '进度已保存' : '这次进度还没保存，先别关闭页面。'}</p>}<div className="dialog-actions"><button className="button primary" onClick={() => setPaused(false)}>接着学</button><button className="button secondary" onClick={onExit}>{session.mode === 'practice' ? '返回词卡' : '返回首页'}</button>{session.mode !== 'practice' && <a className="text-button" href="#/book">翻翻词语书</a>}</div></Dialog>}
  </main>
}

function Result({ session, onExit, onContinue }: { session: Session; onExit: () => void; onContinue?: () => void }) {
  return <main className="result page" id="main"><div className="result-mark"><Icon name="check" size={42}/></div><p className="eyebrow">{session.mode === 'lesson' ? `第 ${session.lessonId} 课` : session.mode === 'review' ? '这次复习' : '自由练习'}</p><h1>这一轮完成了</h1><p>一起练习了 {session.completed} 个词。</p><div className="result-actions"><button className="button primary" onClick={onExit}>{session.mode === 'practice' ? '返回词卡' : '今天先到这里'}</button>{onContinue && <button className="button secondary" onClick={onContinue}>再学一小会儿<Icon name="arrow"/></button>}</div></main>
}

export function Learn() {
  const { state } = useApp()
  const session = state.session
  if (!session) return <main className="empty page" id="main"><h1>从一个单词开始</h1><a className="button primary" href="#/">返回首页</a></main>
  if (session.phase === 'result') {
    const canContinue = dueWords(state, localDay()).length || nextLesson(state)
    return <Result session={session} onExit={() => { store.dispatch({ type: 'leaveResult' }); navigate('/') }} onContinue={canContinue ? () => store.dispatch({ type: 'start', mode: dueWords(state, localDay()).length ? 'review' : 'lesson' }) : undefined}/>
  }
  const onboarding = session.mode === 'lesson' && !state.settings.onboardingSeen
  return <>{!onboarding && <Exercise session={session} dispatch={action => store.dispatch(action)} onExit={() => navigate('/')}/>} {onboarding && <Onboarding onClose={() => store.dispatch({ type: 'settings', value: { onboardingSeen: true } })}/>}</>
}

export function Practice({ wordId }: { wordId: string }) {
  const [session, setSession] = useState(() => createSession('practice', [wordId], null))
  useEffect(() => { store.dispatch({ type: 'peek', wordId }) }, [wordId])
  const exit = () => navigate(`/book/${wordId}`)
  if (session.phase === 'result') return <Result session={session} onExit={exit}/>
  return <Exercise session={session} dispatch={action => setSession(old => stepSession(old, action))} onExit={exit}/>
}
