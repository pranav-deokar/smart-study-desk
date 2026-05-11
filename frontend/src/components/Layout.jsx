import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import './Layout.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/pomodoro', label: 'Pomodoro', icon: '◎' },
  { to: '/analytics', label: 'Analytics', icon: '◈' },
  { to: '/insights', label: 'Insights', icon: '◉' },
  { to: '/warnings', label: 'Warnings', icon: '⚠' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className={`layout ${collapsed ? 'layout--collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="8" width="32" height="20" rx="3" stroke="#00d4ff" strokeWidth="1.5"/>
              <rect x="14" y="28" width="12" height="4" fill="#00d4ff" opacity="0.3"/>
              <rect x="10" y="32" width="20" height="1.5" rx="0.75" fill="#00d4ff"/>
              <circle cx="20" cy="18" r="5" stroke="#00d4ff" strokeWidth="1.5"/>
              <circle cx="20" cy="18" r="2" fill="#00d4ff" opacity="0.5"/>
              <line x1="8" y1="14" x2="12" y2="18" stroke="#00d4ff" strokeWidth="1" opacity="0.5"/>
              <line x1="28" y1="14" x2="32" y2="18" stroke="#00d4ff" strokeWidth="1" opacity="0.5"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">SmartDesk</span>
              <span className="brand-sub">v1.0</span>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="sidebar__scan-line" />

        <nav className="sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && location.pathname.startsWith(item.to) && <span className="nav-indicator" />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="user-info">
            <div className="user-avatar">{(user?.full_name || user?.email || 'U')[0].toUpperCase()}</div>
            {!collapsed && (
              <div className="user-details">
                <span className="user-name">{user?.full_name || 'User'}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
