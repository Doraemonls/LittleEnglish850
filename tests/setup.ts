import data from '../src/data/words.generated.json' with { type: 'json' }
import { initializeCatalog } from '../src/data/catalog'

initializeCatalog(data)
