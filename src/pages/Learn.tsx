import { useEffect, useRef, useState } from 'react'
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

const titles: Record<string, { en: string; zh: string }> = {
  card: { en: 'Word card', zh: '看图识词' },
  read: { en: 'Choose a meaning', zh: '看词选义' },
  listen: { en: 'What do you hear?', zh: '听音选词' },
  spell: { en: 'Listen and spell.', zh: '听音拼写' },
  sentence: { en: 'Read a sentence.', zh: '语境例句' },
}

const stepLabels: Record<string, { en: string; zh: string }> = {
  card: { en: 'Card', zh: '词卡' },
  read: { en: 'Meaning', zh: '选义' },
  listen: { en: 'Listen', zh: '听音' },
  spell: { en: 'Spell', zh: '拼写' },
  sentence: { en: 'Sentence', zh: '例句' },
}

function Exercise({ session, dispatch, onExit }: { session: Session; dispatch: (action: ExerciseAction) => void; onExit: () => void }) {
  const { state, status } = useApp()
  const [paused, setPaused] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const [skippedWord, setSkippedWord] = useState<string | null>(null)
  const skipButtonRef = useRef<HTMLButtonElement>(null)
  const keepPractisingRef = useRef<HTMLButtonElement>(null)
  const word = getWord(session.wordIds[session.index])
  const question = session.question
  const done = isQuiz(question) && session.flags[question].done
  const stepKey = `${session.index}-${question}`
  const [wrongAttempt, setWrongAttempt] = useState<{ stepKey: string; choiceId: string } | null>(null)
  const wrongChoice = wrongAttempt?.stepKey === stepKey ? wrongAttempt.choiceId : null

  useEffect(() => {
    if (state.settings.spokenGuidance) audioPlayer.play(`assets/audio/prompt-${question}.mp3`, state.settings.volume, undefined, state.settings.chineseVoice)
    return () => audioPlayer.stop()
    // Guidance runs once per question, not on every saved letter or volume update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.index, question])
  useEffect(() => {
    if (session.feedback && state.settings.spokenGuidance) audioPlayer.play(`assets/audio/prompt-${session.feedback}.mp3`, state.settings.volume, undefined, state.settings.chineseVoice)
    // Feedback changes on an answer; saved input changes do not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.feedback])
  const pause = () => { audioPlayer.stop(); setPaused(true) }
  const hint = (open: boolean) => { audioPlayer.stop(); dispatch({ type: 'hint', open }) }
  const skip = () => {
    audioPlayer.stop()
    setSkipOpen(false)
    setSkippedWord(word.word)
    dispatch({ type: 'skip' })
  }
  const label = session.mode === 'lesson' ? `Lesson ${session.lessonId}` : session.mode === 'review' ? 'Review' : 'Practice'

  const questions = session.mode === 'review' ? ['spell', 'listen', 'read', 'sentence'] : ['card', 'read', 'listen', 'spell', 'sentence']
  const currentIdx = questions.indexOf(question)

  useEffect(() => {
    if (!skippedWord) return
    const timeout = window.setTimeout(() => setSkippedWord(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [skippedWord])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (paused || skipOpen || session.hintOpen) return
      const target = e.target as HTMLElement
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      const isInteractive = target?.closest('button, a, [role="button"]') !== null
      if (isInteractive) return
      if (e.key === 'Enter') {
        if (!isQuiz(question) || done) {
          e.preventDefault()
          audioPlayer.stop()
          dispatch({ type: 'next' })
        }
        return
      }
      if (e.key === ' ' && !isInput) {
        e.preventDefault()
        if (question === 'card' || question === 'spell' || question === 'listen') {
          audioPlayer.play(word.audio.word, state.settings.volume)
          if (question === 'spell' || question === 'listen') dispatch({ type: 'heard' })
        } else if (question === 'sentence') {
          audioPlayer.play(word.audio.sentence, state.settings.volume)
        }
        return
      }
      if (!isInput && (question === 'read' || question === 'listen') && !done) {
        if (question === 'listen' && !session.heard) return
        const choiceIdx = parseInt(e.key, 10) - 1
        const choices = session.choices[question]
        if (choiceIdx >= 0 && choiceIdx < choices.length) {
          e.preventDefault()
          audioPlayer.stop()
          const choiceId = choices[choiceIdx]
          if (choiceId !== word.id) setWrongAttempt({ stepKey, choiceId })
          else setWrongAttempt(null)
          dispatch({ type: 'answer', choice: choiceId })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paused, skipOpen, session, question, done, word, state.settings.volume, dispatch, stepKey])

  return <main className="learn page" id="main" lang="en">
    <div className="exercise-nav"><span>{label}<span className="round-progress">{session.index + 1} / {session.wordIds.length}</span></span><button className="text-button" onClick={pause}><Icon name="pause"/>{session.mode === 'practice' ? 'Leave' : 'Pause'}</button></div>
    <div className="step-dots" role="img" aria-label={`Current step: ${titles[question].en}`}>
      {questions.map((q, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = q === question
        return <span key={q} className={`step-dot ${isCurrent ? 'current' : ''} ${isPast ? 'done' : ''}`} title={`${stepLabels[q].zh} (${stepLabels[q].en})`}>
          {isPast ? <Icon name="check" size={13}/> : <span className="step-dot-label">{stepLabels[q].zh}</span>}
        </span>
      })}
    </div>
    <section className={`exercise-panel ${question}-panel`}>
      {question !== 'card' && <div className="question-header">
        <h1 className="question-title">{question === 'read' ? <>What does <span className="question-word">{word.word}</span> mean?</> : titles[question].en}</h1>
        <span className="question-subtitle">{titles[question].zh}</span>
      </div>}
      {question === 'card' && <WordCard word={word} language="en"/>}
      {question === 'sentence' && <><div className="sentence-word">{word.word}</div><Sentence word={word} language="en"/></>}
      {(question === 'spell' || question === 'listen') && <AudioButton large src={word.audio.word} language="en" label={session.heard ? 'Listen again' : 'Listen'} onFinished={() => dispatch({ type: 'heard' })}/>}
      {question === 'listen' && !session.heard && <div className="listen-prompt-banner"><Icon name="sound" size={20}/><span>先点上方大喇叭听读音哦~</span></div>}
      {(question === 'read' || question === 'listen') && <>
        <div className="choices">{session.choices[question].map(id => {
          const choice = getWord(id)
          const isChosen = done && id === word.id
          const isWrong = id === wrongChoice
          return <div className={`choice-row ${isChosen ? 'chosen' : ''} ${isWrong ? 'wrong-choice' : ''}`} key={id}>
            <button className="choice" disabled={done || (question === 'listen' && !session.heard)} onClick={() => {
              audioPlayer.stop()
              if (id !== word.id) setWrongAttempt({ stepKey, choiceId: id })
              else setWrongAttempt(null)
              dispatch({ type: 'answer', choice: id })
            }}>
              <span lang="zh-CN">{choice.meaning}</span>{choice.illustration && <span className="choice-picture" aria-hidden="true">{choice.illustration}</span>}{isChosen && <Icon name="check"/>}
            </button>
            <AudioButton src={choice.audio.meaning} label={`Play meaning: ${choice.meaning}`} variant="icon" language="en"/>
          </div>
        })}</div>
      </>}
      {question === 'spell' && <SpellingInput key={word.id} session={session} onEdit={edit => dispatch({ type: 'spell', edit })}/>}
      <div className={`answer-feedback ${session.feedback === 'correct' ? 'success' : ''}`} role="status" aria-live="polite">
        {session.feedback === 'correct' ? <><Icon name="check"/>Correct!</> : session.feedback === 'retry' ? 'Try again' : session.feedback === 'letters' ? 'One letter at a time' : null}
      </div>
      {(!isQuiz(question) || done) && <button className="button primary full continue-button" onClick={() => { audioPlayer.stop(); dispatch({ type: 'next' }) }}>{question === 'card' ? 'Try it' : question === 'sentence' ? session.index === session.wordIds.length - 1 ? 'Finish' : 'Next word' : 'Continue'}<Icon name="arrow"/></button>}
      {session.mode === 'lesson' && question === 'card' && <>
        <button ref={skipButtonRef} className="button secondary full skip-word-button" onClick={() => { audioPlayer.stop(); setSkipOpen(true) }}><Icon name="check"/>I know this word</button>
        <span className="skip-word-help">Skip and review it later</span>
      </>}
      {isQuiz(question) && !done && <button className="text-button hint-button" onClick={() => hint(true)}><Icon name="bulb"/>Hint</button>}
    </section>
    {skippedWord && <div className="skip-word-status" role="status" aria-live="polite" aria-atomic="true"><span className="skip-word-status-mark"><Icon name="check" size={18}/></span><span><strong>{skippedWord}</strong> · Learned</span></div>}
    {session.hintOpen && <Dialog title="Word hint" onClose={() => hint(false)}><div className="dialog-top"><h2>Word hint</h2><button className="icon-button" aria-label="Dismiss hint" onClick={() => hint(false)}><Icon name="close"/></button></div><WordCard word={word} language="en"/><button className="button primary full" onClick={() => hint(false)}>Close hint</button></Dialog>}
    {skipOpen && <Dialog title={`Skip ${word.word}?`} initialFocusRef={keepPractisingRef} returnFocusRef={skipButtonRef} onClose={() => setSkipOpen(false)}><div className="skip-word-dialog">
      <div className="skip-word-dialog-mark" aria-hidden="true"><Icon name="check"/></div>
      <h2>Skip this word?</h2>
      <p>We’ll mark “{word.word}” as learned and review it later.</p>
      <div className="dialog-actions"><button className="button primary" onClick={skip}>Yes, skip</button><button ref={keepPractisingRef} className="button secondary" onClick={() => setSkipOpen(false)}>Keep practising</button></div>
    </div></Dialog>}
    {paused && <Dialog title="Paused" onClose={() => setPaused(false)}><h2>Paused</h2>{session.mode !== 'practice' && <p>{status === 'saved' ? 'Progress saved' : 'Progress not saved. Keep this page open.'}</p>}<div className="dialog-actions"><button className="button primary" onClick={() => setPaused(false)}>Keep learning</button><button className="button secondary" onClick={onExit}>{session.mode === 'practice' ? 'Back to word' : 'Home'}</button>{session.mode !== 'practice' && <a className="text-button" href="#/book">Wordbook</a>}</div></Dialog>}
  </main>
}

function Result({ session, onExit, onContinue }: { session: Session; onExit: () => void; onContinue?: () => void }) {
  return <main className="result page" id="main" lang="en">
    <div className="result-card">
      <div className="result-mark"><Icon name="check" size={42}/></div>
      <div className="result-stars" aria-hidden="true">⭐ ⭐ ⭐</div>
      <p className="eyebrow">{session.mode === 'lesson' ? `Lesson ${session.lessonId}` : session.mode === 'review' ? 'Review' : 'Practice'}</p>
      <h1>All done!</h1>
      <p className="result-subtitle">You practised {session.completed} {session.completed === 1 ? 'word' : 'words'}.</p>
      <div className="result-trophy-shelf" aria-label="本轮学习成果">
        <h2 className="trophy-shelf-title">本轮攻克词汇</h2>
        <div className="trophy-grid">
          {session.wordIds.slice(0, session.completed).map(id => {
            const w = getWord(id)
            return <div key={id} className="trophy-card">
              <span className="trophy-illustration" aria-hidden="true">{w.illustration || '📘'}</span>
              <div className="trophy-text">
                <strong className="trophy-word" lang="en">{w.word}</strong>
                <span className="trophy-meaning" lang="zh-CN">{w.meaning}</span>
              </div>
              <AudioButton src={w.audio.word} label={`听 ${w.word}`} variant="icon" language="en"/>
            </div>
          })}
        </div>
      </div>
      <div className="result-actions">
        <button className="button primary" onClick={onExit}>{session.mode === 'practice' ? 'Back to word' : 'Done for today'}</button>
        {onContinue && <button className="button secondary" onClick={onContinue}>Keep learning<Icon name="arrow"/></button>}
      </div>
    </div>
  </main>
}

export function Learn() {
  const { state } = useApp()
  const session = state.session
  if (!session) return <main className="empty page" id="main" lang="en"><h1>Start with a word</h1><a className="button primary" href="#/">Home</a></main>
  if (session.phase === 'result') {
    const canContinue = dueWords(state, localDay()).length || nextLesson(state)
    return <Result session={session} onExit={() => { store.dispatch({ type: 'leaveResult' }); navigate('/') }} onContinue={canContinue ? () => store.dispatch({ type: 'start', mode: dueWords(state, localDay()).length ? 'review' : 'lesson' }) : undefined}/>
  }
  const onboarding = session.mode === 'lesson' && !state.settings.onboardingSeen
  return onboarding ? <main className="learn page" id="main" lang="en"><Onboarding language="en" onClose={() => store.dispatch({ type: 'settings', value: { onboardingSeen: true } })}/></main> : <Exercise session={session} dispatch={action => store.dispatch(action)} onExit={() => navigate('/')}/>
}

export function Practice({ wordId }: { wordId: string }) {
  const [session, setSession] = useState(() => createSession('practice', [wordId], null))
  useEffect(() => { store.dispatch({ type: 'peek', wordId }) }, [wordId])
  const exit = () => navigate(`/book/${wordId}`)
  if (session.phase === 'result') return <Result session={session} onExit={exit}/>
  return <Exercise session={session} dispatch={action => setSession(old => stepSession(old, action))} onExit={exit}/>
}
