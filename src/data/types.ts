export type Quiz = 'read' | 'listen' | 'spell'
export type Question = 'card' | Quiz | 'sentence'
export type ReviewStep = 0 | 1 | 2 | 3
export type LearningStatus = 'unstarted' | 'started' | 'learned' | 'mastered'

export interface Word {
  id: string
  word: string
  lessonId: number
  position: number
  category: string
  meaning: string
  partOfSpeech: string
  context: string
  illustration: string
  sentence: string
  sentenceZh: string
  support: { word: string; meaning: string; audio: string }[]
  options: string[]
  audio: { word: string; sentence: string; meaning: string }
  sources: string[]
}

export interface WordProgress {
  teaching: 'started' | 'completed'
  reviewStep: ReviewStep
  lastReviewedOn: string | null
  nextReviewOn: string | null
}

export interface QuizFlag { done: boolean; error: boolean; hint: boolean }
export interface Session {
  mode: 'lesson' | 'review' | 'practice'
  phase: 'active' | 'result'
  lessonId: number | null
  wordIds: string[]
  index: number
  question: Question
  choices: { read: string[]; listen: string[] }
  input: string
  flags: Record<Quiz, QuizFlag>
  hintOpen: boolean
  heard: boolean
  feedback: 'correct' | 'retry' | 'letters' | null
  settled: boolean
  completed: number
  retry: number
}

export interface AppState {
  schemaVersion: 1
  contentVersion: string
  words: Record<string, WordProgress>
  session: Session | null
  settings: { volume: number; spokenGuidance: boolean; onboardingSeen: boolean; chineseVoice?: 'xiaoxiao' | 'yunxi' }
}
