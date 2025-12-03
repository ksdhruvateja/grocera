import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import '../styles/components/Navbar.css';

function Navbar() {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar zippyyy-navbar-glass organic-navbar">
      <div className="container">
        <div className="navbar-content">
          {/* Zippyyy Logo */}
          <Link to="/" className="navbar-logo zippyyy-logo-link organic-logo-link">
            <img src={process.env.PUBLIC_URL + '/zippyyy-logo.png'} alt="Zippyyy Logo" className="zippyyy-logo-img organic-logo-img" />
            <span className="zippyyy-brand-text organic-brand-text">Zippyyy</span>
          </Link>

          {/* Navigation Links (template style, visible on desktop) */}
          <div className="navbar-links desktop-only">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/products" className="nav-link">Shop</Link>
            <Link to="/about" className="nav-link">About</Link>
            <Link to="/products" className="nav-link">Categories</Link>
            <Link to="/contact" className="nav-link">Contact</Link>
          </div>

          {/* User Actions */}
          <div className="navbar-actions">
            {/* Cart Icon - Only show for customers */}
            {isAuthenticated && !isAdmin && (
              <Link
                to="/cart"
                className="cart-icon-link"
                aria-label="Shopping cart"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V17A2 2 0 0115 19H9A2 2 0 017 17V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </Link>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="user-menu">
                <div className="user-info desktop-only">
                  <span>नमस्ते, {user?.name}</span>
                  {isAdmin && <span className="admin-badge">Admin Panel</span>}
                </div>
                <div className="dropdown" ref={dropdownRef}>
                  <button
                    className="dropdown-toggle"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19A4 4 0 0016 15H8A4 4 0 004 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                  <div className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
                    {!isAdmin && (
                      <>
                        <Link
                          to="/profile"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          👤 Profile
                        </Link>
                        <Link
                          to="/orders"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          📦 My Orders
                        </Link>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <Link
                          to="/admin/dashboard"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          📊 Dashboard
                        </Link>
                        <Link
                          to="/admin/pricing"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          💲 Price Management
                        </Link>
                        <Link
                          to="/admin/products"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          📦 Manage Products
                        </Link>
                        <Link
                          to="/admin/orders"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          📋 Manage Orders
                        </Link>
                        <Link
                          to="/admin/messages"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          💬 Customer Messages
                        </Link>
                        <Link
                          to="/admin/users"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          👥 Manage Users
                        </Link>
                        <Link
                          to="/admin/contacts"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          📞 Contact Messages
                        </Link>
                      </>
                    )}
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="dropdown-item logout-btn">🚪 Logout</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="auth-buttons desktop-only">
                  <Link to="/login" className="btn-signin-exact">Sign In</Link>
                  <Link to="/register" className="btn-signup-exact">Sign Up</Link>
                </div>
                {/* Mobile Auth Buttons - Visible directly on mobile */}
                <div className="auth-buttons mobile-only">
                  <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
                  <Link to="/register" className="btn-signup-exact">Sign Up</Link>
                </div>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-menu-toggle mobile-only"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          {!isAdmin && (
            <>
              <Link to="/" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Home
              </Link>
              <Link to="/products" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Services
              </Link>
              <Link to="/about" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                About Us
              </Link>
              <Link to="/products" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Categories
              </Link>
              <Link to="/contact" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Contact
              </Link>
              {isAuthenticated && (
                <Link to="/cart" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                  🛒 Cart {itemCount > 0 && `(${itemCount})`}
                </Link>
              )}
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/admin/dashboard" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                📊 Dashboard
              </Link>
              <Link to="/admin/pricing" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                💲 Pricing
              </Link>
              <Link to="/admin/products" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                📦 Products
              </Link>
              <Link to="/admin/orders" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                📋 Orders
              </Link>
              <Link to="/admin/messages" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                💬 Messages
              </Link>
            </>
          )}

          {isAuthenticated ? (
            <>
              <div className="mobile-nav-divider"></div>
              <div className="mobile-user-info">
                <span>नमस्ते, {user?.name}</span>
                {isAdmin && <span className="admin-badge">Admin Panel</span>}
              </div>
              {!isAdmin && (
                <>
                  <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    👤 Profile
                  </Link>
                  <Link to="/orders" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    📦 My Orders
                  </Link>
                </>
              )}
              <button onClick={handleLogout} className="mobile-nav-link logout-btn">
                🚪 Logout
              </button>
            </>
          ) : (
            <>
              <div className="mobile-nav-divider"></div>
              <Link to="/login" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                🔑 Login
              </Link>
              <Link to="/register" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                👤 Join BringIt
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;