import MinimalCountdown from '../components/MinimalCountdown'

const OFFICIAL_LINKS = [
  { label: 'NMIXX Official YouTube', url: 'https://www.youtube.com/c/NMIXXOfficial' },
  { label: 'NMIXX Official X', url: 'https://x.com/NMIXX_official' },
  { label: 'NMIXX Official X(Members)', url: 'https://x.com/WE_NMIXX' },
  { label: 'NMIXX Official Instagram', url: 'https://www.instagram.com/nmixx_official' },
  { label: 'NMIXX Official Facebook', url: 'https://www.facebook.com/NMIXXOfficial' },
  { label: 'NMIXX Official TikTok', url: 'https://www.tiktok.com/@nmixx_official' },
  { label: 'NMIXX Official Weibo', url: 'https://weibo.com/NMIXXOfficial' },
  { label: 'NMIXX Official Website', url: 'https://nmixx.jype.com' },
  { label: 'NMIXX Official FANS', url: 'https://www.jypfans.com/community/nmixx' },
]

export default function Home() {
  return (
    <div className="card">
      <div className="home-hero">
        <img
          src="/Strange_muse_album_cover.jpg"
          alt='NMIXX 6th EP "Strange Muse" 앨범 커버'
          className="home-hero-cover"
        />
        <div className="home-hero-info">
          <h1 className="home-hero-title">NMIXX 6th EP &quot;Strange Muse&quot;</h1>
          <p className="home-hero-release">2026.10.19 6PM (KST)</p>
          <MinimalCountdown
            target="2026-10-19T18:00:00+09:00"
            labels={['일', '시간', '분', '초']}
          />
          <a
            className="home-hero-cta"
            href="https://nmixx.lnk.to/StrangeMuse"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pre-Save &amp; Pre-Add &amp; Pre-Order
          </a>
          <a
            className="home-hero-cta"
            href="https://t.co/XmPrYCxOGd"
            target="_blank"
            rel="noopener noreferrer"
          >
            음원총공팀 Strange Muse 앨범 공동구매
          </a>
        </div>
      </div>

      <div className="detail-divider" />

      <div className="home-section">
        <div className="home-section-label">Trailer</div>
        <h2 className="home-trailer-title">NMIXX(엔믹스) &quot;Strange Muse&quot; Trailer</h2>
        <div className="content-embeds home-trailer">
          <div className="embed-youtube">
            <iframe
              src="https://www.youtube.com/embed/k6K0UadWsL0"
              title="NMIXX(엔믹스) Strange Muse Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <div className="detail-divider" />

      <div className="home-section">
        <div className="home-section-label">공식 채널</div>
        <div className="home-link-chips">
          {OFFICIAL_LINKS.map((link) => (
            <a
              key={link.url}
              className="home-link-chip"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
