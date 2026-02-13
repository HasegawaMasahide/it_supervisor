import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '概要' },
    { path: '/issues', label: 'Issues' },
    { path: '/reports', label: 'レポート' }
  ];

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">🔍</span>
          <span className="logo-text">IT Supervisor</span>
        </Link>
        <nav className="nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="user-info">
          <span className="user-name">株式会社サンプル</span>
          <span className="user-avatar">👤</span>
        </div>
      </div>
    </header>
  );
}
