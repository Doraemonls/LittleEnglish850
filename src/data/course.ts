import { words } from './catalog'
import type { CourseClass, CourseUnit, LearningPlan } from './types'

type CompactGroup = [id: string, title: string, titleZh: string, wordIndexes: number[]]
type CompactUnit = [id: string, title: string, titleZh: string, groups: CompactGroup[]]
type CompactClass = [id: string, unitId: string, groupIds: string[], wordIndexes: number[]]
interface CompactCourse { v: 1; u: CompactUnit[]; s: CompactClass[]; a: CompactClass[] }

export const courseUnits: CourseUnit[] = []
export const courseClasses: Record<LearningPlan, CourseClass[]> = { standard: [], accelerated: [] }
export const unitById = new Map<string, CourseUnit>()
export const classById = new Map<string, CourseClass>()
export const placementByWordId = new Map<string, { unitId: string; groupId: string }>()

export function initializeCourse(data: unknown): void {
  const compact = data as Partial<CompactCourse>
  const index = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) < words.length
  if (!compact || compact.v !== 1 || !Array.isArray(compact.u) || !Array.isArray(compact.s) || !Array.isArray(compact.a)) throw new Error('Incomplete course catalogue')
  if (compact.u.length !== 34 || !compact.u.every(unit => Array.isArray(unit) && unit.length === 4
    && unit.slice(0, 3).every(value => typeof value === 'string' && value.length)
    && Array.isArray(unit[3]) && unit[3].length === 10
    && unit[3].every(group => Array.isArray(group) && group.length === 4 && group.slice(0, 3).every(value => typeof value === 'string' && value.length)
      && Array.isArray(group[3]) && group[3].length >= 2 && group[3].length <= 3 && group[3].every(index)))) throw new Error('Invalid course units')

  courseUnits.splice(0)
  unitById.clear(); classById.clear(); placementByWordId.clear()
  for (const [id, title, titleZh, compactGroups] of compact.u) {
    const groups = compactGroups.map(([groupId, title, titleZh, indexes]) => ({ id: groupId, title, titleZh, wordIds: indexes.map(i => words[i].id) }))
    const unit = { id, title, titleZh, groups, wordIds: groups.flatMap(group => group.wordIds) }
    courseUnits.push(unit); unitById.set(id, unit)
    groups.forEach(group => group.wordIds.forEach(wordId => {
      if (placementByWordId.has(wordId)) throw new Error(`Duplicate course word: ${wordId}`)
      placementByWordId.set(wordId, { unitId: id, groupId: group.id })
    }))
  }
  if (placementByWordId.size !== 850) throw new Error('Course does not cover 850 words')

  const decodeClasses = (items: CompactClass[], plan: LearningPlan, expected: number) => {
    if (items.length !== expected) throw new Error(`Invalid ${plan} class count`)
    return items.map(([id, unitId, groupIds, indexes], sequence) => {
      if (typeof id !== 'string' || !unitById.has(unitId) || !Array.isArray(groupIds) || !groupIds.length || !indexes.every(index)) throw new Error(`Invalid course class: ${id}`)
      const wordIds = indexes.map(i => words[i].id)
      const result = { id, sequence: sequence + 1, unitId, groupIds, wordIds, plan }
      classById.set(id, result)
      return result
    })
  }
  courseClasses.standard = decodeClasses(compact.s, 'standard', 170)
  courseClasses.accelerated = decodeClasses(compact.a, 'accelerated', 136)
}

export const getCourseClass = (id: string) => {
  const result = classById.get(id)
  if (!result) throw new Error(`Unknown course class: ${id}`)
  return result
}

const planSizes = {
  standard: { target: 5, minimum: 4, maximum: 6 },
  accelerated: { target: 7, minimum: 6, maximum: 8 },
} satisfies Record<LearningPlan, { target: number; minimum: number; maximum: number }>

export function nextCourseClass(plan: LearningPlan, completed: (wordId: string) => boolean): CourseClass | null {
  const sizes = planSizes[plan]
  for (const unit of courseUnits) {
    const first = unit.groups.findIndex(group => group.wordIds.some(id => !completed(id)))
    if (first < 0) continue
    const candidates: { groupIds: string[]; wordIds: string[] }[] = []
    const groupIds: string[] = []
    const wordIds: string[] = []
    for (const group of unit.groups.slice(first)) {
      const incomplete = group.wordIds.filter(id => !completed(id))
      if (!incomplete.length) continue
      if (wordIds.length + incomplete.length > sizes.maximum) break
      groupIds.push(group.id); wordIds.push(...incomplete)
      if (wordIds.length >= sizes.minimum) candidates.push({ groupIds: [...groupIds], wordIds: [...wordIds] })
    }
    const selected = candidates.sort((a, b) => Math.abs(a.wordIds.length - sizes.target) - Math.abs(b.wordIds.length - sizes.target))[0]
      ?? { groupIds, wordIds }
    if (!selected.wordIds.length) return null
    const authored = courseClasses[plan].find(item => item.unitId === unit.id && arraysEqual(item.groupIds, selected.groupIds) && arraysEqual(item.wordIds, selected.wordIds))
    if (authored) return authored
    const sequence = courseClasses[plan].find(item => item.groupIds.includes(selected.groupIds[0]))?.sequence ?? 1
    return {
      id: `${plan}-adaptive-${String(sequence).padStart(3, '0')}-${selected.groupIds.at(-1)}`,
      sequence, unitId: unit.id, groupIds: selected.groupIds, wordIds: selected.wordIds, plan,
    }
  }
  return null
}

const arraysEqual = (left: string[], right: string[]) => left.length === right.length && left.every((value, index) => value === right[index])

export const unitProgress = (unit: CourseUnit, completed: (wordId: string) => boolean) =>
  unit.wordIds.filter(completed).length
