export function AppleIllustration({ size = 96 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="apple-art">
    <path d="M50 31C25 8 3 30 10 61C13 87 33 99 50 90C67 99 87 87 91 61C97 30 75 8 50 31Z" fill="var(--coral)" stroke="var(--ink)" strokeWidth="3"/>
    <path d="M50 30Q45 15 53 4" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round"/>
    <path d="M54 18Q62 -1 82 8Q73 27 54 18Z" fill="var(--green)" stroke="var(--ink)" strokeWidth="3"/>
    <path d="M27 39Q19 47 22 56" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"/>
  </svg>
}

export function BookIllustration() {
  return <svg className="home-book" width="200" height="160" viewBox="0 0 200 160" aria-hidden="true">
    <rect x="9" y="29" width="174" height="117" rx="5" fill="var(--yellow)"/>
    <path d="M15 21Q53 11 95 30Q128 12 170 22V129Q128 120 95 138Q56 121 15 129Z" fill="white" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M95 30V138" stroke="var(--ink)" strokeWidth="3"/>
    <text x="32" y="63" fontSize="20" fontWeight="700" fill="var(--ink)">hello</text>
    <path d="M33 81H74M33 96H64" stroke="var(--border)" strokeWidth="3" strokeLinecap="round"/>
    <g transform="translate(112 43) scale(.45)"><AppleIllustration size={100}/></g>
    <text x="114" y="112" fontSize="14" fontWeight="600" fill="var(--ink)">apple</text>
  </svg>
}
