import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <span className="navbar-logo-mark" aria-hidden="true">✈</span>
          <span className="navbar-logo-text">
            Wing<em>span</em>
          </span>
        </Link>

        <div className="navbar-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/flights">Flights</NavLink>
          {user && <NavLink to="/history">My Trips</NavLink>}
        </div>

        <div className="navbar-actions">
          <button
            className="navbar-ai-btn"
            type="button"
            onClick={() => window.dispatchEvent(new Event("wingspan:open-assistant"))}
          >
            ✦ <span className="navbar-ai-btn-text">Trip Assistant</span>
          </button>
          {user ? (
            <>
              <Link to="/profile" className="navbar-user-chip">
                👤 {user.fullName?.split(" ")[0]}
              </Link>
              <button className="btn btn-outline" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">
                Login
              </Link>
              <Link to="/signup" className="btn btn-accent">
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={`navbar-burger${menuOpen ? " open" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu">
          <NavLink to="/" onClick={closeMenu}>Home</NavLink>
          <NavLink to="/flights" onClick={closeMenu}>Flights</NavLink>
          {user && <NavLink to="/history" onClick={closeMenu}>My Trips</NavLink>}
          <button
            type="button"
            className="navbar-mobile-ai-btn"
            onClick={() => {
              closeMenu();
              window.dispatchEvent(new Event("wingspan:open-assistant"));
            }}
          >
            ✦ Trip Assistant
          </button>
          {user ? (
            <>
              <Link to="/profile" onClick={closeMenu}>👤 Profile ({user.fullName?.split(" ")[0]})</Link>
              <button type="button" className="btn btn-outline" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline" onClick={closeMenu}>Login</Link>
              <Link to="/signup" className="btn btn-accent" onClick={closeMenu}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
