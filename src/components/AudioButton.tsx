import { useSyncExternalStore } from 'react'
import { audioPlayer } from '../services/audio'
import { useApp } from '../app/store'
import { Icon } from './Icon'

function renderHighlighted(text: string, highlight?: string) {
  if (!highlight) return text
  const parts = text.split(new RegExp(`(\\b${highlight}\\b)`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      <mark key={i} className="sentence-target-highlight">{part}</mark>
    ) : part
  )
}

export function AudioButton({ src, label = '听单词', onFinished, large = false, language = 'zh-CN', variant = 'standard', text, highlight }: { src: string; label?: string; onFinished?: () => void; large?: boolean; language?: 'zh-CN' | 'en'; variant?: 'standard' | 'sentence' | 'icon'; text?: string; highlight?: string }) {
  const { state } = useApp()
  const sound = useSyncExternalStore(audioPlayer.subscribe, audioPlayer.getSnapshot)
  const active = sound.url === src
  const loading = active && sound.status === 'loading'
  const playing = active && sound.status === 'playing'
  const english = language === 'en'
  const status = loading ? (english ? 'Loading…' : '准备声音…') : playing ? (english ? 'Playing' : '正在播放') : ''
  const error = english ? (!state.settings.volume ? 'Sound is off. Ask a parent to turn up the volume.' : 'Sound is unavailable. Try again.') : sound.message
  return <div className={`audio-control audio-${variant} ${large ? 'audio-large' : ''}`} lang={language}>
    <button type="button" className={`audio-button ${playing ? 'playing' : ''}`} aria-label={label} aria-busy={loading} onClick={() => audioPlayer.play(src, state.settings.volume, onFinished)}>
      {variant === 'sentence' ? <><span className="english-sentence" lang="en">{renderHighlighted(text || '', highlight)}</span><Icon name="sound" size={24}/><span className="sr-only" role="status">{status}</span></> : <><Icon name="sound" size={24}/><span className={variant === 'icon' ? 'sr-only' : undefined}>{status || label}</span></>}
    </button>
    {active && sound.status === 'error' && <p className="audio-error" role="alert">{error}</p>}
  </div>
}
