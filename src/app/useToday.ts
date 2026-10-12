import { useSyncExternalStore } from 'react'
import { localDay } from '../domain/progress'

function subscribe(listener: () => void) {
  let timer: number
  const refresh = () => {
    window.clearTimeout(timer)
    listener()
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    timer = window.setTimeout(refresh, midnight.getTime() - now.getTime() + 50)
  }
  refresh()
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', refresh)
  return () => {
    window.clearTimeout(timer)
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', refresh)
  }
}

export const useToday = () => useSyncExternalStore(subscribe, localDay)
