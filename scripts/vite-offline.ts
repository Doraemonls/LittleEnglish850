import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { HtmlTagDescriptor, Plugin, ResolvedConfig } from 'vite'

// Production-only loading support for slow or distant networks (GitHub Pages has no mainland
// China servers and sends max-age=600 for every file):
// - index.html starts both catalogue downloads and preloads the App chunk, so startup is one parallel wave;
// - sw.js (from src/sw/service-worker.js) keeps the app, catalogues and audio on the device.

async function filesUnder(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true, recursive: true })
    return entries.filter(entry => entry.isFile()).map(entry => path.join(entry.parentPath, entry.name)).sort()
  } catch { return [] }
}

const PRELOAD_MARKER = '<!-- startup-preload -->'
// Read by src/main.tsx.
const STARTUP_FETCHES = 'littleEnglishStartupFetches'
const posix = (file: string) => file.split(path.sep).join('/')

export function offlineSupport(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'little-english-offline',
    apply: 'build',
    configResolved(resolved) { config = resolved },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const files = Object.values(context.bundle ?? {})
        const asset = (prefix: string) => files.find(file => file.type === 'asset' && file.fileName.startsWith(prefix))?.fileName
        const app = files.find(file => file.type === 'chunk' && file.name === 'App')?.fileName
        const catalogues = [asset('assets/words.generated-'), asset('assets/course.generated-')]
        if (!app || catalogues.some(file => !file)) throw new Error('Startup catalogues or App chunk missing from the bundle')
        if (!html.includes(PRELOAD_MARKER)) throw new Error(`index.html needs ${PRELOAD_MARKER}`)
        // Start both catalogue downloads at once; src/main.tsx takes over these responses. A plain fetch
        // is used instead of <link rel=preload>, which WebKit (and Chromium under a service worker)
        // would not hand to fetch(), downloading each file twice. Placed before the stylesheet link
        // so the script does not wait for CSS.
        const preload = `<script>
      window.${STARTUP_FETCHES} = {};
      ${JSON.stringify(catalogues.map(file => `./${file}`))}.forEach(function (path) { var href = new URL(path, document.baseURI).href; var pending = fetch(href); pending.catch(function () {}); window.${STARTUP_FETCHES}[href] = pending });
    </script>`
        const tags: HtmlTagDescriptor[] = [{ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `./${app}` }, injectTo: 'head' }]
        return { html: html.replace(PRELOAD_MARKER, preload), tags }
      },
    },
    async writeBundle(options, bundle) {
      const outDir = options.dir ?? path.resolve(config.root, config.build.outDir)
      const publicDir = config.publicDir
      const audioDir = publicDir ? path.join(publicDir, 'assets', 'audio') : ''
      const audioFiles = audioDir ? await filesUnder(audioDir) : []
      const publicFiles = publicDir ? (await filesUnder(publicDir)).filter(file => !audioFiles.includes(file)).map(file => posix(path.relative(publicDir, file))) : []
      // The parent-only source catalogue is opened as a link, not needed offline.
      const built = Object.keys(bundle).filter(name => !name.endsWith('.map') && !name.startsWith('assets/words.source.generated-'))
      const precache = [...new Set([...built, ...publicFiles])].sort()
      const audioHash = createHash('sha256')
      for (const file of audioFiles) audioHash.update(posix(path.relative(audioDir, file))).update(await readFile(file))
      const source = await readFile(path.resolve(config.root, 'src/sw/service-worker.js'), 'utf8')
      const html = bundle['index.html']
      const version = createHash('sha256').update(JSON.stringify(precache)).update(html?.type === 'asset' ? String(html.source) : '').update(source).digest('hex').slice(0, 12)
      const settings = { version, audioVersion: audioHash.digest('hex').slice(0, 12), precache }
      await writeFile(path.join(outDir, 'sw.js'), `const CONFIG = ${JSON.stringify(settings)}
${source}`)
    },
  }
}
