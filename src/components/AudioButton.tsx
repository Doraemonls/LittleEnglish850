import { useSyncExternalStore } from 'react'
import { audioPlayer } from '../services/audio'
import { useApp } from '../app/store'
import { Icon } from './Icon'

export function AudioButton({ src, label = '听单词', onFinished, large = false }: { src: string; label?: string; onFinished?: () => void; large?: boolean }) {
  const { state } = useApp()
  const sound = useSyncExternalStore(audioPlayer.subscribe, audioPlayer.getSnapshot)
  const active = sound.url === src
  const loading = active && sound.status === 'loading'
  const playing = active && sound.status === 'playing'
  return <div className={`audio-control ${large ? 'audio-large' : ''}`}>
    <button type="button" className={`audio-button ${playing ? 'playing' : ''}`} aria-label={label} aria-busy={loading} onClick={() => audioPlayer.play(src, state.settings.volume, onFinished)}>
      <Icon name="sound" size={large ? 34 : 22}/><span>{loading ? '准备声音…' : playing ? '正在播放' : label}</span>
    </button>
    {active && sound.status === 'error' && <p className="audio-error" role="alert">{sound.message}</p>}
  </div>
}
