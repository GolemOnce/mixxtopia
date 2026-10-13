import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-links">
        <Link to="/terms">이용약관</Link>
        <Link to="/privacy">개인정보처리방침</Link>
      </div>
      <div className="site-footer-notice muted">
        본 사이트는 NMIXX, JYP Entertainment와 무관한 비공식 팬페이지입니다.
      </div>
      <div className="site-footer-copyright muted">&copy; 2026 mixxtopia. All rights reserved.</div>
    </footer>
  )
}
