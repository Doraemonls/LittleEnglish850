# Course Data Structure — Fixed-Sentence Class Test

Status: approved design input for implementation. This document defines data ownership and saved-session shape; it does not change the current runtime by itself.

## 1. Ownership

The course uses three layers of data:

1. `content/words.json` owns each word, its fixed English sentence, Chinese translation, and sentence audio.
2. `content/course.json` owns curriculum order, units, content groups, the two pacing plans, and the normalized sentence-cloze assessment bank.
3. Browser state owns only the selected plan, active class snapshot, test attempts, and word progress. It must not copy the full course catalogue.

The fixed sentence is snapshotted into the generated assessment item. A sentence edit therefore changes generated course content and requires a content-version change; an active class continues using its saved item snapshot.

## 2. Authored and generated course shape

```ts
type LearningPlanId = 'standard' | 'accelerated'

interface Course {
  schemaVersion: 2
  courseId: 'little-english-850'
  wordCount: 850
  units: CourseUnit[]
  plans: Record<LearningPlanId, LearningPlan>
  assessments: {
    sentenceCloze: SentenceClozeBank
  }
}

interface CourseUnit {
  id: string
  sequence: number
  title: string
  titleZh: string
  wordCount: number
  groups: ContentGroup[]
}

interface ContentGroup {
  id: string
  sequence: number
  wordIds: string[]       // exactly 2–3 stable word IDs
  title: string
  titleZh: string
  sharedContext: string
  sharedExample: string   // preserves the group's fixed English sentences
  sharedExampleZh: string
}

interface LearningPlan {
  targetNewWords: number
  normalRange: [number, number]
  estimatedMinutes: [number, number]
  classes: CourseClass[]
}

interface CourseClass {
  id: string
  sequence: number
  unitId: string
  groupIds: string[]
  wordIds: string[]
  newWordCount: number
  exitTest: ClassExitTest
}

interface ClassExitTest {
  type: 'sentence-cloze'
  required: true
  itemIds: string[]       // same words and order as CourseClass.wordIds
  passRule: 'all-correct'
  retryPolicy: 'retry-incorrect-until-correct'
}
```

## 3. Normalized fixed-sentence test bank

Each word has exactly one shared item. Standard and Accelerated classes reference this item rather than storing duplicate sentence text.

```ts
interface SentenceClozeBank {
  schemaVersion: 1
  instructions: string
  completionRule: string
  scoring: string
  audioPolicy: string
  items: SentenceClozeItem[]
}

interface SentenceClozeItem {
  id: string              // sentence-cloze-{wordId}
  wordId: string
  responseType: 'single-word-text'
  fixedSentence: string   // unmodified authored sentence
  sentenceZh: string
  promptBefore: string    // text before the target word
  promptAfter: string     // text after the target word
  displayAnswer: string   // preserves sentence capitalization
  acceptedAnswers: string[]
  normalization: 'trim-lowercase-en-US'
  revealAudio: string     // available only after correct submission
}
```

Rendering uses `promptBefore + input + promptAfter`. Storing the two prompt segments avoids fragile runtime string replacement and identifies the intended occurrence if a word appears more than once.

Example:

```json
{
  "wordId": "ogden-apple",
  "fixedSentence": "This is an apple.",
  "promptBefore": "This is an ",
  "promptAfter": ".",
  "displayAnswer": "apple",
  "acceptedAnswers": ["apple"]
}
```

## 4. Saved active-class snapshot

An active class must be resumable even if the parent changes plan or generated course data changes in another tab. Save the actual groups, words, and test items selected when the class began.

```ts
type ClassPhase = 'learning' | 'exit-test' | 'result'

interface ActiveClassSession {
  schemaVersion: 2
  sessionId: string
  courseId: string
  contentVersion: string
  planAtStart: LearningPlanId
  classId: string
  classSequence: number
  unitId: string
  groupIds: string[]
  wordIds: string[]
  phase: ClassPhase
  learning: LearningSessionState
  exitTest: ActiveExitTest
}

interface ActiveExitTest {
  itemSnapshots: SentenceClozeItem[]
  itemOrder: string[]
  currentIndex: number
  input: string
  results: Record<string, ExitTestItemResult>
  passed: boolean
}

interface ExitTestItemResult {
  firstAttemptCorrect: boolean | null
  attempts: number
  correct: boolean
}
```

`itemSnapshots` intentionally contains the small 4–8-item test. It protects an in-progress class from sentence edits while avoiding a copy of the full 850-item bank in browser state.

## 5. State transitions

```text
learning
  └─ all class learning activities settled
       └─ exit-test
            ├─ incorrect: record attempt, remain on/requeue item
            ├─ correct: record result, reveal fixed sentence audio
            └─ every item correct
                 └─ result + settle class word progress
```

Closing or refreshing during `exit-test` preserves the active class. A plan change never rebuilds its test; the new plan applies when assembling the next class.

## 6. Validation invariants

- The assessment bank contains exactly 850 items and 850 unique word IDs.
- Every item references an existing word and uses that word's fixed sentence and translation.
- The target word occupies the exact span between `promptBefore` and `promptAfter`.
- `acceptedAnswers` contains the target word; normalization trims whitespace and ignores English letter case only.
- Every class has one test item per actual new word, in the same deterministic order, with no extras or duplicates.
- Standard tests contain 4–6 items and Accelerated tests contain 6–8 items under the normal assembly rules.
- Full-sentence audio is hidden before correctness and revealed afterward.
- Class progress is settled only when `passed` is true.

## 7. Migration boundary

The current runtime session schema is version 1 and has no class-level test phase. Implementation must introduce session schema version 2 and an explicit migration. Existing settled word progress remains unchanged. A legacy active lesson may finish in its legacy flow or be closed according to the migration rule in `COURSE_FEATURE_PLAN.md`; it must not be silently reinterpreted as a partially completed sentence test.
