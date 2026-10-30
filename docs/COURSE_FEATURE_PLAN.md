# Course Feature Plan

Status: proposed implementation plan. This document does not change the current product behavior.

## 1. Goal

Replace the fixed alphabetical five-word lesson structure with one coherent Little English 850 curriculum that supports two learning plans:

| Learning plan | New-word target per class | Normal range | Intended use |
| --- | ---: | ---: | --- |
| Standard | 5 | 4–6 | Recommended default for most children |
| Accelerated | 7 | 6–8 | Children who are comfortable with a longer class |

Both plans must use the same 850 words, thematic order, review schedule, exercises, and word-level progress. A plan changes the amount of new content assembled into a class; it does not create a separate curriculum or a separate copy of progress.

## 2. Product Principles

1. **One course, two plans.** The product is the Little English 850 course. Standard and Accelerated are learning plans, not different courses or ability labels.
2. **Meaningful context before exact counts.** Content groups remain intact even when a class contains one word more or less than its target.
3. **Thematic, not merely similar.** Group words that can be used together in one situation. Avoid introducing several easily confused category members at the same time.
4. **Reviews remain mandatory.** Due review is completed before a new-word class. The selected plan never increases or bypasses due review.
5. **Progress belongs to words.** Changing plans, regrouping classes, or pausing a class must not erase completed word progress.
6. **Predictable child experience.** The parent chooses the plan; the child sees a simple “Today’s class” experience rather than level-management controls.

## 3. Curriculum Hierarchy

```text
Little English 850 course
└── Learning plan: Standard or Accelerated
    └── Unit: broad theme containing about 20–30 words
        └── Content group: stable micro-context containing 2–3 words
            └── Class: generated bundle of consecutive groups
                └── Word activities and shared context
```

### 3.1 Unit

A unit is a stable thematic section such as Home, Food, School, People, Animals, Movement, Position, Nature, Time, Feelings, Materials, or Ideas. Unit boundaries and order are identical for both plans.

Each unit requires:

- Stable ID and sequence number.
- Chinese and English title.
- Short child-friendly description.
- Optional scene or illustration identifier.
- Ordered content-group IDs.
- Derived progress from the words contained in the unit.

The final number and size of units must be decided after all 850 words are mapped. A working target is approximately 30–40 units containing 20–30 words each.

### 3.2 Content group

A content group is the smallest curriculum unit and must never be split merely to reach an exact class size. Each group contains two or three ordered target words that share a usable micro-context.

Each group requires:

- Stable ID, unit ID, and sequence number.
- Chinese and English title.
- Two or three target word IDs.
- One shared situation or learning purpose.
- One short shared example, dialogue, or micro-story.
- Optional prerequisite group IDs for validation and authoring guidance.
- Editorial flags for confusing pairs or intentional contrasts.

Grouping rules:

- Prefer words that combine naturally across roles: noun, action, description, or relationship.
- Include no more than two easily confused new words unless the group explicitly teaches a visual contrast.
- Do not group words solely because they begin with the same letter.
- Avoid five-word semantic lists such as five containers, five animals, or five near-synonyms.
- Permit intentional contrast groups such as `in`, `on`, and `under` when the comparison is directly illustrated.
- Reuse earlier words in shared examples so vocabulary becomes cumulative.

Example unit: **At the table**

| Group | Target words | Shared use |
| --- | --- | --- |
| Table things | `cup`, `water`, `table` | Identify the scene and its objects |
| Put it here | `put`, `on` | “Put the cup of water on the table.” |
| Time to eat | `bread`, `eat` | “I eat bread at the table.” |

The first two groups form a five-word Standard class. All three groups form a seven-word Accelerated class.

### 3.3 Class

A class is a generated learning session rather than a permanent owner of words. It contains the next consecutive incomplete content groups, subject to the selected plan’s target and range.

Assembly rules:

1. Resume an active saved class before assembling anything new.
2. Require all currently due reviews to be completed before offering new content.
3. Start with the earliest incomplete content group in curriculum order.
4. Add whole consecutive groups until the plan’s normal range is reached.
5. Prefer the combination closest to the plan target without exceeding its normal maximum.
6. If adding the next group would exceed the maximum, stop at the current valid minimum.
7. Near the end of the course or a unit, allow a smaller final class instead of importing unrelated words.
8. Exclude words already completed through a previous class or “I know this word,” while retaining the group context for the remaining words.

The class result stores the actual word IDs practised. It must not assume every Standard class has exactly five words or every Accelerated class exactly seven.

## 4. Learning-Plan Selection

### 4.1 First use

After basic onboarding and before the first new-word class, show a parent-facing **Choose a learning plan** screen.

Standard card:

- Label: Standard / 标准学习
- “About 5 new words in each class.”
- “Usually 5–10 minutes, plus review.”
- Marked Recommended.

Accelerated card:

- Label: Accelerated / 加速学习
- “About 7 new words in each class.”
- “Usually 10–15 minutes, plus review.”
- Explain that review workload grows with the faster pace.

The confirmation screen must state that both plans teach the same 850 words and can be changed later without losing progress.

### 4.2 Existing users

- Migrate existing users to Standard automatically.
- Do not interrupt an active saved lesson with plan selection.
- Show the selected plan in Parent Settings and allow it to be changed there.
- A plan change applies only to the next newly assembled class; the active class remains unchanged.

### 4.3 Daily behavior

The plan defines the recommended size of one new-word class. It is not a hard daily learning lock.

- Home prioritizes due review, then the next new-word class.
- The result page makes **Done for today** the primary action.
- Optional extra learning may remain available after completion, but it must be visually secondary.
- If reviews remain due, extra new content is unavailable.
- The first release does not automatically promote or demote children between plans.

## 5. Class Experience

Each new-word class follows this structure:

1. **Review warm-up:** complete due words before entering new content.
2. **Scene preview:** show the unit and group context without testing.
3. **Learn Group 1:** introduce pronunciation, core meaning, and word card.
4. **Quick retrieval:** mix recognition and listening across the words already introduced.
5. **Learn the next group:** repeat introduction and quick retrieval.
6. **Mixed practice:** interleave meaning, listening, and spelling across all class words.
7. **Context finish:** read and hear the shared sentence, dialogue, or micro-story.
8. **End-of-class sentence test:** for every new word in the assembled class, show its fixed example sentence with that target word blanked; the child types the missing word.
9. **Class result:** after all test items are correct, show practised words, first-attempt test accuracy, items needing more help, unit progress, and the next review expectation.

The existing per-word flow can be retained during the first technical milestone, but the target design should move from completing every activity for one word before seeing the next word toward group introduction followed by mixed retrieval.

Spelling remains part of the course, with these content rules:

- Short and regular beginner words may use unscaffolded spelling.
- Long, irregular, or abstract words should offer letter or chunk support during first teaching.
- Independent review continues to use spelling as the strongest recall check.

### 5.1 End-of-class sentence test

The test is a required class-level retrieval check, distinct from the teaching activities for each word.

- Use the fixed English and Chinese example sentence already authored for each word; do not generate a new sentence at runtime.
- Include one sentence-cloze item for every new word actually practised in the class: normally 4–6 items for Standard and 6–8 for Accelerated.
- Replace only the target word with a single text field. The child types the missing word, not the whole sentence.
- Compare answers after trimming surrounding whitespace and applying English case-insensitive matching. Do not accept misspellings.
- Keep retrying incorrect items until all are correct, but preserve first-attempt correctness and total attempts for the result and future reporting.
- Do not play the unblanked sentence audio before the answer because it reveals the word. Make the fixed sentence audio available after a correct answer.
- Save the item order, current item, input, first-attempt result, and attempt count so refresh can resume the test exactly.
- Mark the class complete and settle its word progress only after the required test is passed. Leaving during the test keeps the class active.

## 6. Course and Progress Screens

### 6.1 Home

Add the following course information without making the child manage curriculum structure:

- Current unit title.
- Current learning-plan label.
- Number of due review words.
- Approximate number of new words in the next class.
- Estimated time range.
- One primary action: Continue, Review, or Start today’s class.

### 6.2 Course overview

Replace the current flat 170-lesson catalogue with a unit-first view:

- Unit cards in curriculum order.
- Unit state: Not started, In progress, Learned, or Mastered.
- Word and group progress within an expanded unit.
- Current unit highlighted.
- Completed units remain browsable.
- Future units may be browsed, but the main learning action follows curriculum order.

### 6.3 Wordbook

- Keep English and Chinese search.
- Replace or supplement the fixed lesson filter with Unit and Content Group filters.
- Display the word’s unit and group on its detail page.
- Preserve free practice and its current separation from formal progress.

### 6.4 Parent Settings

- Show Standard or Accelerated as a two-option control.
- Explain the new-word target and estimated time for each plan.
- Confirm that switching does not reset progress.
- When a class is active, explain that the change begins with the next class.

## 7. Content Redesign

### 7.1 Ordering

Replace alphabetical ordering with a cumulative learning sequence:

1. High-imageability objects and actions used in a child’s daily life.
2. Core relationship and function words introduced through usable chunks.
3. Common descriptions and contrasts.
4. Broader nature, social, material, and process vocabulary.
5. Abstract and lower-imageability vocabulary after sufficient sentence foundations exist.

Frequency, child relevance, imageability, spelling difficulty, sentence usefulness, and prerequisite value should inform the order. Alphabetical position must not influence it.

### 7.2 Sentences and shared context

Audit all target sentences while regrouping the catalogue:

- Keep sentences short, natural, and age appropriate.
- Teach one core meaning per target word.
- Prefer previously learned core words and current-group words.
- Limit unexplained supporting vocabulary.
- Use one main sentence pattern per class.
- Recycle important words across later groups and units.
- Mark intentional previews when a later core word must appear early.
- Add a shared sentence or micro-story for every content group.

Automated content reports should identify:

- Core words used before their teaching position.
- Supporting-word counts per sentence.
- Sentence length outliers.
- Repeated or near-duplicate examples.
- Groups containing too many words with the same role or confusing meaning.

### 7.3 Quiz distractors

Decouple choice distractors from class membership. The current rule of taking distractors from the same five-word lesson will become unreliable when words are intentionally connected.

New distractors must:

- Have a distinct meaning from the correct answer.
- Be age appropriate and already introduced where practical.
- Avoid making two answers defensibly correct in the sentence context.
- Avoid repeated fixed positions.
- Be stored or generated deterministically so saved sessions remain resumable.

## 8. Data Model

### 8.1 Authored curriculum data

Add a project-authored curriculum source, for example `content/course.json`, containing:

- Course metadata.
- Ordered units.
- Ordered content groups.
- Group word IDs and shared context.
- Optional prerequisite and editorial metadata.
- A normalized fixed-sentence cloze item bank keyed by stable word ID.
- Per-plan class definitions whose exit tests reference item IDs rather than duplicating sentence text.

Continue keeping word meanings, examples, translations, illustrations, and support vocabulary in their current authored sources unless the content workflow review finds a strong reason to consolidate them.

### 8.2 Runtime catalogue

Extend the generated catalogue with:

- `unitId`
- `groupId`
- Global curriculum sequence
- Unit and group metadata
- Shared group context

Remove the assumption that `lessonId` is derived from `index / 5`. During migration, retain any legacy lesson information only where needed for exported historical compatibility.

### 8.3 Application state

Add:

- Selected learning plan: `standard | accelerated`.
- Active class group IDs and actual word IDs.
- Class schema information needed to validate and resume generated sessions.
- Session phase: learning, end-of-class test, or result.
- Active sentence-test item IDs and deterministic order.
- Current test item, typed input, first-attempt correctness, attempt count, and pass state.

Continue storing:

- Progress by stable word ID.
- One formal active session.
- Review stage and dates per word.
- Settings and voice preferences.

Unit and group progress should be derived from word progress rather than stored independently.

## 9. Compatibility and Migration

Changing word order and lesson membership requires a content-version change and an explicit state migration.

Migration requirements:

1. Preserve all progress records whose stable word IDs still exist.
2. Default existing users to Standard.
3. Preserve review stages and dates.
4. Resume an active legacy session when all saved word IDs and question data remain valid.
5. If an active session cannot be migrated safely, close only that session and retain all settled word progress.
6. Recompute the next content group from the earliest incomplete word in curriculum order.
7. Prevent a plan switch from changing an already active class.
8. Update progress export to include unit and group; document the treatment of the former lesson number.

Do not silently reuse the existing content version after regrouping words.

## 10. Delivery Phases

### Phase 1: Curriculum specification and pilot

- Finalize unit, group, and class authoring rules.
- Define the authored course schema and validation rules.
- Design three representative pilot units: concrete beginner content, relationship/action content, and abstract later content.
- Test Standard and Accelerated assembly against the pilot groups.
- Conduct editorial review and a small child/parent usability trial before mapping all 850 words.

### Phase 2: Full curriculum map

- Assign every word to exactly one unit and one content group.
- Establish the global teaching order.
- Add group titles and shared context.
- Audit sentence prerequisites and rewrite content where necessary.
- Redesign distractors independently of class membership.
- Run automated completeness and prerequisite reports.

### Phase 3: Catalogue and domain model

- Update content compilation and compact browser data.
- Add plan-aware class assembly.
- Replace fixed five-word lesson calculations with unit/group queries.
- Update session validation, progress derivation, review integration, export, and migration.
- Keep active-session save and multi-tab conflict behavior intact.

### Phase 4: Product interface

- Add first-use learning-plan selection.
- Update Home with plan, unit, review, workload, and time information.
- Implement unit-first course browsing.
- Add plan switching to Parent Settings.
- Update class navigation and results for variable word counts.
- Update Wordbook filters and word details.

### Phase 5: Mixed group learning

- Add scene preview and content-group boundaries.
- Introduce words by group before mixed retrieval.
- Interleave class-wide listening and meaning practice.
- Add shared context finish and appropriate spelling scaffolds.
- Preserve accessibility, keyboard use, audio behavior, and resumability.

### Phase 6: Validation and release preparation

- Run type checking, linting, unit tests, content checks, production build, and cross-browser end-to-end tests.
- Test new, existing, migrated, partially completed, and corrupted local states.
- Test both plans across unit boundaries and the final course boundary.
- Complete human editorial review, audio review for changed text, and child usability trials.
- Update `PROJECT.md`, `README.md`, `docs/CONTENT.md`, `docs/DEVELOPMENT.md`, UX documentation, and `CHANGELOG.md` only when implementation behavior is finalized.

## 11. Test Plan

### Domain tests

- Standard assembles whole groups with a target of five and a range of four to six.
- Accelerated assembles whole groups with a target of seven and a range of six to eight.
- Both plans select the same next incomplete curriculum group.
- No class duplicates or skips an incomplete word.
- Small final unit and course classes complete correctly.
- Due reviews take priority over new content.
- Switching plans leaves an active class unchanged.
- Unit and group status derive correctly from word progress.
- Existing review intervals and independent-pass rules remain unchanged.

### Storage and migration tests

- Existing state migrates to Standard with all word progress preserved.
- Review dates and stages survive migration.
- Compatible active sessions resume.
- Incompatible active sessions close without losing settled progress.
- Saved variable-length classes validate and restore.
- Multi-tab conflicts still prevent silent overwrites.

### Content tests

- Exactly 850 unique words exist.
- Every word belongs to exactly one group and one unit.
- Every group contains two or three words unless explicitly exempted.
- Unit, group, and global sequences contain no gaps or duplicates.
- Every group has titles and shared context.
- Exactly 850 fixed-sentence cloze items exist, one for every word.
- Every fixed sentence contains its target word at a valid blank boundary.
- Each class exit test references exactly the new words in that assembled class, with no missing, extra, or duplicate items.
- All choice options are valid and semantically distinct.
- All referenced audio and support entries exist.
- Sentence-prerequisite and support-word reports are generated for editorial review.

### End-to-end tests

- A new parent selects Standard and completes the first class.
- A new parent selects Accelerated and completes a seven-word class.
- Each plan ends a class with the correct 4–8 fixed-sentence cloze items.
- A wrong spelling records an error, retries the item, and cannot finish the class until corrected.
- Refresh during the sentence test restores item order, input state, attempts, and the current item.
- Sentence audio is unavailable before the answer and available after a correct answer.
- The app refreshes and resumes in every class phase.
- A parent changes plan during an active class and sees the change applied afterward.
- Course overview and Wordbook show correct unit/group progress.
- Review backlog blocks new content until it is cleared.
- Mobile, keyboard, screen-reader, audio-failure, and production-deployment flows remain usable.

## 12. Acceptance Criteria

The course feature is complete when:

- Users can choose Standard or Accelerated before beginning new content.
- Both plans traverse one shared thematic curriculum without duplicated progress.
- Words are authored into stable two- or three-word contextual groups.
- Standard and Accelerated assemble coherent classes near their five- and seven-word targets.
- Every completed learning class ends with a required fixed-sentence typing test covering all new words in that class.
- Alphabetical position no longer determines learning order or class membership.
- Due review remains ahead of new learning.
- Parents can switch plans without losing progress.
- Existing user progress migrates safely.
- Course overview, Wordbook, export, and saved sessions understand units and groups.
- All automated checks pass and required human content, audio, and child-use reviews are recorded truthfully.

## 13. Out of Scope for the First Release

- Additional learning plans or a ten-word plan.
- Automatic plan promotion or demotion.
- Placement testing.
- Separate curricula for different ability levels.
- Accounts, cloud synchronization, or cross-device progress.
- AI-generated runtime lessons or runtime changes to the fixed curriculum.
- Competitive rankings, streak pressure, or public social features.
