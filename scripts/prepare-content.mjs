import { readFileSync, writeFileSync } from 'node:fs'

// Keep one editable catalogue; Vite fingerprints the compact browser asset.
const source = new URL('../content/words.json', import.meta.url)
const target = new URL('../src/data/words.generated.json', import.meta.url)
const json = JSON.stringify(JSON.parse(readFileSync(source, 'utf8')))
writeFileSync(target, json + '\n', 'utf8')
console.log(`Prepared catalogue: ${Buffer.byteLength(json) + 1} bytes`)
