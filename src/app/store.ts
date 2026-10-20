import { useSyncExternalStore } from 'react'
import { createStore, STORAGE_KEY } from '../services/storage'

export let store: ReturnType<typeof createStore>

// UI modules may download and evaluate beside the catalogue. Defer browser
// storage access until main has validated and decoded all catalogue IDs.
export function initializeStore() {
  if (store) return
  store = createStore({
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  })
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) store.externalChange()
  })
}
export const useApp = () => useSyncExternalStore(store.subscribe, store.getSnapshot)
