import { readFileSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'

const read = path => JSON.parse(readFileSync(path, 'utf8'))
const words = read('content/words.json')
const course = read('content/course.json')
const source = read('content/source-words.json')
const manifest = existsSync('content/audio-manifest.json') ? read('content/audio-manifest.json') : {}
const sample = process.argv.includes('--sample')
const release = process.argv.includes('--release')
const textOnly = process.argv.includes('--text-only')
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
check(words.length === 850, 'Expected 850 words')
check(new Set(words.map(w => w.id)).size === 850, 'IDs must be unique')
check(new Set(words.map(w => w.word)).size === 850, 'Spellings must be unique')
check(JSON.stringify(words.map(w => w.word).sort()) === JSON.stringify(source.map(w => w.word).sort()), 'Catalogue must match the fixed source exactly')
for (let lesson = 1; lesson <= 170; lesson++) {
  const list = words.filter(w => w.lessonId === lesson)
  check(list.length === 5 && list.map(w => w.position).join(',') === '1,2,3,4,5', `Lesson ${lesson} must have five ordered words`)
}
const byId = new Map(words.map(w => [w.id, w]))
check(course.schemaVersion === 2 && course.wordCount === 850, 'Course schema must be version 2 with 850 words')
check(Array.isArray(course.units) && course.units.length === 34, 'Course must have 34 units')
const groups = course.units.flatMap(unit => unit.groups)
check(groups.length === 340, 'Course must have 340 content groups')
for (const group of groups) {
  check(['title', 'titleZh', 'sharedContext', 'sharedExample', 'sharedExampleZh'].every(field => typeof group[field] === 'string' && group[field].trim()), `${group.id}: missing bilingual title, context, or fixed-sentence example`)
  const groupWords = group.wordIds.map(id => byId.get(id))
  check(groupWords.every(word => word && group.sharedExample.includes(word.sentence) && group.sharedExampleZh.includes(word.sentenceZh)), `${group.id}: shared example must preserve every fixed sentence`)
}
const groupedIds = groups.flatMap(group => group.wordIds)
check(groupedIds.length === 850 && new Set(groupedIds).size === 850 && groupedIds.every(id => byId.has(id)), 'Content groups must cover every word exactly once')
const sentenceItems = course.assessments?.sentenceCloze?.items ?? []
const sentenceById = new Map(sentenceItems.map(item => [item.id, item]))
check(sentenceItems.length === 850 && sentenceById.size === 850, 'Course must have 850 unique fixed-sentence items')
for (const item of sentenceItems) {
  const word = byId.get(item.wordId)
  check(Boolean(word) && item.promptBefore + item.displayAnswer + item.promptAfter === item.fixedSentence && item.fixedSentence === word?.sentence && item.sentenceZh === word?.sentenceZh && item.acceptedAnswers?.includes(word?.word), `${item.id}: invalid fixed-sentence item`)
}
for (const [planId, expectedClasses, min, max] of [['standard', 170, 4, 6], ['accelerated', 136, 6, 8]]) {
  const classes = course.plans?.[planId]?.classes ?? []
  check(classes.length === expectedClasses, `${planId}: incorrect class count`)
  const ids = classes.flatMap(item => item.wordIds)
  check(ids.length === 850 && new Set(ids).size === 850, `${planId}: classes must cover every word exactly once`)
  for (const item of classes) {
    check(item.wordIds.length >= min && item.wordIds.length <= max, `${item.id}: invalid class size`)
    const tested = item.exitTest?.itemIds?.map(id => sentenceById.get(id)?.wordId)
    check(JSON.stringify(tested) === JSON.stringify(item.wordIds), `${item.id}: exit test must match class words`)
  }
}
const sources = read('content/attributions.json')
const selected = sample ? words.slice(0, 20) : words
for (const word of selected) {
  for (const field of ['id', 'word', 'meaning', 'partOfSpeech', 'context', 'sentence', 'sentenceZh']) check(typeof word[field] === 'string' && word[field].trim().length, `${word.id}: missing ${field}`)
  check(new RegExp(`\\b${word.word}\\b`, 'i').test(word.sentence), `${word.id}: example must include target word`)
  check(word.options.length >= 2 && word.options.length <= 3 && new Set(word.options).size === word.options.length && word.options.includes(word.id), `${word.id}: invalid choices`)
  check(word.options.every(id => byId.has(id)), `${word.id}: unknown option`)
  check(new Set(word.options.map(id => byId.get(id)?.meaning)).size === word.options.length, `${word.id}: duplicate meanings`)
  check(word.sources.every(id => sources.sources.some(s => s.id === id)), `${word.id}: unknown attribution`)
  for (const helper of word.support) {
    check(helper.word && helper.meaning && helper.audio, `${word.id}: incomplete supporting word`)
    if (!textOnly) check(existsSync(`public/${helper.audio}`), `${word.id}: missing supporting audio ${helper.word}`)
  }
  if (!textOnly) for (const [kind, url] of Object.entries(word.audio)) {
    const path = `public/${url}`
    check(existsSync(path) && statSync(path).size > 500, `${word.id}: missing ${kind} audio`)
    const manifestKey = url.replace(/^assets\/audio\//, '')
    const meta = manifest[manifestKey]
    check(meta && meta.seconds > .12, `${word.id}: missing audio provenance for ${kind}`)
    if (meta && existsSync(path)) {
      check(meta.text === (kind === 'word' ? word.word : kind === 'sentence' ? word.sentence : word.meaning), `${word.id}: stale ${kind} audio text`)
      check(createHash('sha256').update(readFileSync(path)).digest('hex') === meta.sha256, `${word.id}: changed ${kind} audio file`)
    }
  }
}
const guidance = read('content/guidance.json')
const expectedAudio = new Map()
for (const word of words) {
  for (const [kind, url] of Object.entries(word.audio)) expectedAudio.set(url.replace(/^assets\/audio\//, ''), kind === 'word' ? word.word : kind === 'sentence' ? word.sentence : word.meaning)
  for (const helper of word.support) if (helper.audio.includes('/support-')) expectedAudio.set(helper.audio.replace(/^assets\/audio\//, ''), helper.word.toLowerCase())
}
for (const [key, text] of Object.entries(guidance)) {
  const filename = `xiaoxiao/prompt-${key}.mp3`
  check(!expectedAudio.has(filename), `Guidance filename collides with word audio: ${filename}`)
  expectedAudio.set(filename, text)
}
for (const word of words) {
  expectedAudio.set(`yunxia/${word.word.toLowerCase()}-meaning.mp3`, word.meaning)
}
for (const [key, text] of Object.entries(guidance)) {
  expectedAudio.set(`yunxia/prompt-${key}.mp3`, text)
}
if (!textOnly && !sample) {
  check(Object.keys(manifest).length === expectedAudio.size, 'Audio manifest must exactly match requested files')
  for (const [filename, text] of expectedAudio) {
    check(existsSync(`public/assets/audio/${filename}`), `Missing audio ${filename}`)
    check(manifest[filename]?.text === text, `Incorrect audio text ${filename}`)
  }
}
if (release) {
  check(sources.review.text === 'approved', 'Human editorial review pending')
  check(sources.review.audio === 'approved' && Object.values(manifest).every(m => m.review === 'approved'), 'Human listening review pending')
  check(sources.review.childTrial === 'approved', 'Child usability trial pending')
}
console.log(`${sample ? 'SAMPLE: 20' : 'FULL: 850'} words checked; 34 units; Standard 170 classes; Accelerated 136 classes; ${textOnly ? 'text only' : 'static audio included'}.`)
if (failures.length) { console.error(failures.slice(0, 30).join('\n')); console.error(`${failures.length} issue(s)`); process.exitCode = 1 }
else console.log(`Passed. ${release ? 'Release review passed.' : 'Human review is a separate release gate (--release).'}`)
