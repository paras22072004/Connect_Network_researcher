import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-text">
            <span className="brand-name">GeoConnect</span>
            <span className="brand-tagline">Research & Professional Network</span>
          </div>
        </Link>

        {user ? (
          <>
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              Menu
            </button>

            <nav className={`navbar-nav ${mobileMenuOpen ? 'nav-open' : ''}`}>
              <Link
                to="/discover"
                className={`nav-link ${isActive('/discover') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Discover Nearby
              </Link>
              <Link
                to="/connections"
                className={`nav-link ${isActive('/connections') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Connections
              </Link>
              <Link
                to="/messages"
                className={`nav-link ${isActive('/messages') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Messages
              </Link>
              <Link
                to="/profile"
                className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/settings"
                className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>

              <div className="user-menu">
                <img
                  src={user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user.name}
                  className="nav-avatar"
                />
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            </nav>
          </>
        ) : (
          <div className="nav-auth-buttons">
            <Link to="/login" className="btn btn-outline">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
