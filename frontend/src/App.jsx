import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'

export default function App() {
  const loc = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg text-primary">SmartSpend</Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className={linkCls(loc.pathname === '/')}>Home</Link>
            <Link to="/login" className={linkCls(loc.pathname.startsWith('/login'))}>Login</Link>
            <Link to="/register" className={linkCls(loc.pathname.startsWith('/register'))}>Sign up</Link>
            <Link to="/dashboard" className={ctaCls()}>Dashboard</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-8 text-sm text-gray-600">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <p>© {new Date().getFullYear()} SmartSpend</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary">Twitter</a>
            <a href="#" className="hover:text-primary">GitHub</a>
            <a href="#" className="hover:text-primary">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function linkCls(active) {
  return `px-3 py-1 rounded ${active ? 'text-primary' : 'text-gray-700 hover:text-primary'}`
}
function ctaCls() {
  return 'px-3 py-1 rounded bg-primary text-white hover:brightness-110'
}
