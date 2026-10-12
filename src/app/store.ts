import { useSyncExternalStore } from 'react'
import { createStore, STORAGE_KEY } from '../services/storage'

// Delay browser storage access to the adapter so a denied getter is caught too.
export const store = createStore({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
})
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) store.externalChange()
})
export const useApp = () => useSyncExternalStore(store.subscribe, store.getSnapshot)
