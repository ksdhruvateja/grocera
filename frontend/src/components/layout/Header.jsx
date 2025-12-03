import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/zippyyylogo.png';

function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70 bg-slate-900/90 border-b border-white/10 font-sans">
      <div className="max-w-6xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16 gap-6">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Zippyyy" className="w-8 h-8 rounded" />
              <span className="text-xl font-semibold tracking-tight text-white">Zippyyy</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-gray-200 hover:text-white hover:bg-white/10"
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen ? 'true' : 'false'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Center: nav links */}
          <ul className="hidden md:flex items-center gap-6 mx-auto">
            {[
              { to: '/', label: 'Home' },
              { to: '/shop', label: 'Shop' },
              { to: '/about', label: 'About' },
              { to: '/contact', label: 'Contact' },
            ].map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`h-10 px-3 inline-flex items-center rounded-md text-sm font-medium text-slate-100 tracking-tight transition ${
                    isActive(link.to)
                      ? 'text-white bg-white/10'
                      : 'hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right: actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="h-10 px-3 inline-flex items-center rounded-md text-sm font-medium text-slate-100 tracking-tight hover:text-white hover:bg-white/10 transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              Sign Up
            </Link>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-white/10">
            <ul className="flex flex-col gap-2 p-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/shop', label: 'Shop' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`h-10 w-full inline-flex items-center text-left px-3 rounded-md text-sm font-medium text-slate-100 tracking-tight transition ${
                      isActive(link.to) ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <Link
                  to="/login"
                  className="h-10 px-3 inline-flex items-center justify-center rounded-md text-sm font-medium text-slate-100 tracking-tight hover:text-white hover:bg-white/10 w-full text-center transition"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 w-full text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
