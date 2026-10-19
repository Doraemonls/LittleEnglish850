import { readFileSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'

const read = path => JSON.parse(readFileSync(path, 'utf8'))
const words = read('content/words.json')
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
    const meta = manifest[url.split('/').at(-1)]
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
  for (const [kind, url] of Object.entries(word.audio)) expectedAudio.set(url.split('/').at(-1), kind === 'word' ? word.word : kind === 'sentence' ? word.sentence : word.meaning)
  for (const helper of word.support) if (helper.audio.includes('/support-')) expectedAudio.set(helper.audio.split('/').at(-1), helper.word.toLowerCase())
}
for (const [key, text] of Object.entries(guidance)) {
  const filename = `prompt-${key}.mp3`
  check(!expectedAudio.has(filename), `Guidance filename collides with word audio: ${filename}`)
  expectedAudio.set(filename, text)
}
for (const word of words) {
  expectedAudio.set(`yunxi/${word.word.toLowerCase()}-meaning.mp3`, word.meaning)
}
for (const [key, text] of Object.entries(guidance)) {
  expectedAudio.set(`yunxi/prompt-${key}.mp3`, text)
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
console.log(`${sample ? 'SAMPLE: 20' : 'FULL: 850'} words checked; 170×5 catalogue; ${textOnly ? 'text only' : 'static audio included'}.`)
if (failures.length) { console.error(failures.slice(0, 30).join('\n')); console.error(`${failures.length} issue(s)`); process.exitCode = 1 }
else console.log(`Passed. ${release ? 'Release review passed.' : 'Human review is a separate release gate (--release).'}`)
