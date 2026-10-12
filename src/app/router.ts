import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
export const useRoute = () => useSyncExternalStore(subscribe, () => location.hash.slice(1) || '/')
export const navigate = (path: string) => { location.hash = path }
