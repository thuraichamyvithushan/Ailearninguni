import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, X, Globe2 } from "lucide-react";
import { Brand, Button } from "../components/ui";
import { useAuth } from "../context/AuthContext";
export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="container header-inner">
          <Brand />
          <nav
            className={open ? "public-nav open" : "public-nav"}
            aria-label="Main navigation"
          >
            {[
              ["/courses", "Explore courses"],
              ["/learning-path", "Learning paths"],
              ["/pricing", "Pricing"],
              ["/about", "About us"],
              ["/contact", "Contact"],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} onClick={() => setOpen(false)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link
              to={
                user
                  ? user.role === "student"
                    ? "/student/dashboard"
                    : user.role === "instructor"
                      ? "/instructor"
                      : "/admin"
                  : "/login"
              }
            >
              {user ? "My portal" : "Log in"}
            </Link>
            <Button to="/register" className="compact">
              Get started
              <ArrowUpRight size={15} />
            </Button>
            <button
              className="icon-button mobile-toggle"
              aria-label="Toggle navigation"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main key={location.pathname}>
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Brand />
              <p>
                Human ambition. Artificial intelligence.
                <br />A world of possibilities.
              </p>
            </div>
            <div>
              <strong>Explore</strong>
              <Link to="/courses">Courses</Link>
              <Link to="/learning-path">Learning paths</Link>
              <Link to="/pricing">Learning formats</Link>
            </div>
            <div>
              <strong>Ai Learning Uni</strong>
              <Link to="/about">About us</Link>
              <Link to="/contact">Contact & support</Link>
              <Link to="/login">Student portal</Link>
            </div>
            <div>
              <Globe2 size={20} />
              <p>
                Built for curious minds.
                <br />
                Available around the world.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Ai Learning Uni. Keep moving forward.
            </span>
            <span>Learn with purpose. Build with confidence.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
