// Fixed, sparse accents stay outside the reading surfaces and never intercept input.
export function Decorations({ theme }: { theme: 'home' | 'learn' | 'book' | 'parent' | 'about' }) {
  return <div className={`decorations decorations-${theme}`} aria-hidden="true">
    <span className="decor-dot decor-coral"/>
    <span className="decor-dot decor-blue"/>
    {theme !== 'parent' && theme !== 'about' && <>
      <span className="decor-dot decor-yellow"/>
      <svg className="decor-wave" width="36" height="12" viewBox="0 0 72 24" fill="none"><path d="M2 12Q10 0 18 12T34 12T50 12T66 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
    </>}
    {theme !== 'learn' && <span className="decor-emoji decor-sprout">{theme === 'book' ? '🌼' : theme === 'parent' ? '🌿' : '🌱'}</span>}
    {theme === 'home' && <><span className="decor-ring"/><span className="decor-emoji decor-cloud">☁️</span></>}
  </div>
}
