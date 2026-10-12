import data from '../content/words.json' with { type: 'json' }
import { initializeCatalog } from '../src/data/catalog'

initializeCatalog(data)
