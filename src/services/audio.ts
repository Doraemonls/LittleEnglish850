type AudioStatus = 'idle' | 'loading' | 'playing' | 'error'
let snapshot: { url: string; status: AudioStatus; message: string } = { url: '', status: 'idle', message: '' }
let player: HTMLAudioElement | null = null
let release: (() => void) | null = null
const listeners = new Set<() => void>()
const update = (url: string, status: AudioStatus, message = '') => {
  snapshot = { url, status, message }
  listeners.forEach(listener => listener())
}

export function resolveAudioUrl(url: string, voice: 'xiaoxiao' | 'yunxia' = 'xiaoxiao'): string {
  const chosenVoice = voice === 'yunxia' ? 'yunxia' : 'xiaoxiao'
  if (url.includes('-meaning.mp3') || url.includes('prompt-')) {
    if (url.includes('assets/audio/xiaoxiao/')) {
      return url.replace('assets/audio/xiaoxiao/', `assets/audio/${chosenVoice}/`)
    }
    if (url.includes('assets/audio/yunxia/')) {
      return url.replace('assets/audio/yunxia/', `assets/audio/${chosenVoice}/`)
    }
    return url.replace('assets/audio/', `assets/audio/${chosenVoice}/`)
  }
  return url
}

export const audioPlayer = {
  getSnapshot: () => snapshot,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  stop() {
    if (player) { player.pause(); player.removeAttribute('src'); player.load(); player = null }
    release?.(); release = null
    update('', 'idle')
  },
  play(url: string, volume: number, onFinished?: () => void, voice?: 'xiaoxiao' | 'yunxia'): void {
    audioPlayer.stop()
    if (!volume) { update(url, 'error', '声音已关闭，请在家长设置中调高音量。'); return }
    const resolvedUrl = resolveAudioUrl(url, voice)
    update(url, 'loading')
    const element = new Audio(import.meta.env.BASE_URL + resolvedUrl)
    player = element
    element.volume = volume
    let finished = false
    const clear = () => { window.clearTimeout(timeout); element.onended = null; element.onerror = null; element.onplaying = null }
    const fail = () => {
      if (player !== element || finished) return
      if (voice === 'yunxia') {
        finished = true; clear(); element.pause()
        audioPlayer.play(url, volume, onFinished, 'xiaoxiao')
        return
      }
      finished = true; clear(); element.pause()
      update(url, 'error', '声音暂时没准备好，点按钮再听一次。')
    }
    const timeout = window.setTimeout(fail, 20_000)
    release = clear
    element.onplaying = () => { window.clearTimeout(timeout); if (player === element) update(url, 'playing') }
    element.onerror = fail
    element.onended = () => {
      if (player !== element || finished) return
      finished = true; clear(); update(url, 'idle'); onFinished?.()
    }
    element.play().catch(fail)
  },
}
