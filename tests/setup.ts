import data from '../src/data/words.generated.json' with { type: 'json' }
import { initializeCatalog } from '../src/data/catalog'
import course from '../src/data/course.generated.json' with { type: 'json' }
import { initializeCourse } from '../src/data/course'

initializeCatalog(data)
initializeCourse(course)
