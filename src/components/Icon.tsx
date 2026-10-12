import type { CSSProperties } from 'react'

const paths = {
  book: <><path d="M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/><path d="M12 6v15"/></>,
  sound: <><path d="m11 4-6 5H2v6h3l6 5Z"/><path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  back: <><path d="M20 12H4m6-6-6 6 6 6"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
  parent: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/></>,
  export: <><path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/></>,
  pause: <><path d="M8 5v14m8-14v14"/></>,
  bulb: <><path d="M9 18h6m-6 3h6M8 15c-6-5-2-12 4-12s10 7 4 12l-1 2H9Z"/></>,
}
export function Icon({ name, size = 22, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>
}
