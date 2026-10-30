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
          <div className="embed-youtube">
            <iframe
              src="https://www.youtube.com/embed/roHWN9fL2SM?si=1ZKztDtuUsPxW1Jx"
              title="NMIXX(엔믹스) 긴 소원 (Birthday Wish) M/V"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <div className="detail-divider" />

      <div className="home-section">
        <details className="home-section-group">
          <summary className="home-section-label">
            <span className="home-section-chevron">▾</span>
            Trailer
          </summary>
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
        </details>

        <details className="home-section-group">
          <summary className="home-section-label">
            <span className="home-section-chevron">▾</span>
            HighlightMedley
          </summary>
          <h2 className="home-trailer-title">
            NMIXX(엔믹스) &quot;Strange Muse&quot; A Cappella Highlight Medley (Choir Ver.)
          </h2>
          <div className="content-embeds home-trailer">
            <div className="embed-youtube">
              <iframe
                src="https://www.youtube.com/embed/RI6n1V-eoOA"
                title="NMIXX(엔믹스) Strange Muse A Cappella Highlight Medley (Choir Ver.)"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          <h2 className="home-trailer-title">
            NMIXX(엔믹스) &quot;Strange Muse&quot; Original Highlight Medley
          </h2>
          <div className="content-embeds home-trailer">
            <div className="embed-youtube">
              <iframe
                src="https://www.youtube.com/embed/TPYAJ13wrwo"
                title="NMIXX(엔믹스) Strange Muse Original Highlight Medley"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </details>
      </div>

      <div className="detail-divider" />

      <div className="home-section">
        <details className="home-section-group" open>
          <summary className="home-section-label">
            <span className="home-section-chevron">▾</span>
            공식 채널 바로가기
          </summary>
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
        </details>
      </div>
    </div>
  )
}
