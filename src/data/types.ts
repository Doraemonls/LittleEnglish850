export type Quiz = 'read' | 'listen' | 'spell'
export type Question = 'card' | Quiz | 'sentence'
export type ReviewStep = 0 | 1 | 2 | 3
export type LearningStatus = 'unstarted' | 'started' | 'learned' | 'mastered'
export type LearningPlan = 'standard' | 'accelerated'

export interface ContentGroup { id: string; title: string; titleZh: string; wordIds: string[] }
export interface CourseUnit { id: string; title: string; titleZh: string; groups: ContentGroup[]; wordIds: string[] }
export interface CourseClass { id: string; sequence: number; unitId: string; groupIds: string[]; wordIds: string[]; plan: LearningPlan }

export interface Word {
  id: string
  word: string
  lessonId: number
  meaning: string
  context: string
  illustration: string
  sentence: string
  sentenceZh: string
  support: { word: string; meaning: string; audio: string }[]
  options: string[]
  audio: { word: string; sentence: string }
}

export interface WordProgress {
  teaching: 'started' | 'completed'
  reviewStep: ReviewStep
  lastReviewedOn: string | null
  nextReviewOn: string | null
}

export interface QuizFlag { done: boolean; error: boolean; hint: boolean }
export interface SentenceTestItem {
  wordId: string
  promptBefore: string
  promptAfter: string
  displayAnswer: string
  sentenceZh: string
  audio: string
}
export interface SentenceTestResult { firstAttemptCorrect: boolean | null; attempts: number; correct: boolean }
export interface ExitTestState {
  items: SentenceTestItem[]
  index: number
  input: string
  feedback: 'correct' | 'retry' | null
  results: Record<string, SentenceTestResult>
  passed: boolean
}
export interface Session {
  mode: 'lesson' | 'review' | 'practice'
  phase: 'active' | 'exit-test' | 'result'
  classId: string | null
  classSequence: number | null
  unitId: string | null
  groupIds: string[]
  planAtStart: LearningPlan | null
  wordIds: string[]
  skippedWordIds: string[]
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
  exitTest: ExitTestState | null
}

export interface AppState {
  schemaVersion: 2
  contentVersion: string
  words: Record<string, WordProgress>
  session: Session | null
  settings: { volume: number; spokenGuidance: boolean; onboardingSeen: boolean; learningPlan: LearningPlan; planSelected: boolean; chineseVoice?: 'xiaoxiao' | 'yunxia' }
}
