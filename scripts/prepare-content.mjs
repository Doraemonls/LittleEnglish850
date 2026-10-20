import { readFileSync, writeFileSync } from 'node:fs'

// Keep one editable catalogue; Vite fingerprints a normalized browser asset.
const source = new URL('../content/words.json', import.meta.url)
const target = new URL('../src/data/words.generated.json', import.meta.url)
const readableTarget = new URL('../src/data/words.source.generated.json', import.meta.url)
const words = JSON.parse(readFileSync(source, 'utf8'))
const helperKey = helper => JSON.stringify([helper.word, helper.meaning, helper.audio])
const helperByKey = new Map()
for (const word of words) {
  for (const helper of word.support) {
    const key = helperKey(helper)
    if (!helperByKey.has(key)) helperByKey.set(key, [helper.word, helper.meaning, helper.audio])
  }
}
const helpers = [...helperByKey.values()]
const helperIndex = new Map(helpers.map((helper, index) => [JSON.stringify(helper), index]))
const wordIndex = new Map(words.map((word, index) => [word.id, index]))
const browserCatalogue = {
  v: 1,
  h: helpers,
  w: words.map(word => [
    word.word, word.meaning, word.context, word.illustration, word.sentence, word.sentenceZh,
    word.support.map(helper => helperIndex.get(helperKey(helper))),
    word.options.map(id => wordIndex.get(id)),
    word.audio.word, word.audio.sentence,
  ]),
}
const json = JSON.stringify(browserCatalogue)
writeFileSync(target, json + '\n', 'utf8')
writeFileSync(readableTarget, JSON.stringify(words) + '\n', 'utf8')
console.log(`Prepared catalogue: ${Buffer.byteLength(json) + 1} bytes`)
