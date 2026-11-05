import { byId } from '../data/catalog'
import type { AppState } from '../data/types'
import { resolveAudioUrl } from '../services/audio'
import { dueWords, nextClass } from './progress'

// Spoken guidance played by Learn for each question and feedback state.
const PROMPTS = ['card', 'read', 'listen', 'spell', 'sentence', 'correct', 'retry', 'letters']
const MAX_REVIEW_WORDS = 30

/** Audio the child is likely to need next, most urgent first: the open session, due reviews, then the next class. */
export function upcomingAudio(state: AppState, today: string): string[] {
  if (!state.settings.planSelected) return []
  const session = state.session && state.session.phase !== 'result' ? state.session : null
  const ids = new Set([...session?.wordIds ?? [], ...dueWords(state, today).slice(0, MAX_REVIEW_WORDS), ...nextClass(state)?.wordIds ?? []])
  const paths = state.settings.spokenGuidance ? PROMPTS.map(name => resolveAudioUrl(`assets/audio/prompt-${name}.mp3`, state.settings.chineseVoice)) : []
  for (const item of session?.exitTest?.items ?? []) paths.push(item.audio)
  for (const id of ids) {
    const word = byId.get(id)
    if (word) paths.push(word.audio.word, word.audio.sentence, ...word.support.map(support => support.audio))
  }
  return [...new Set(paths)]
}
