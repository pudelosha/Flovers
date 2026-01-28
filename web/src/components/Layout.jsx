import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Start" },
  { to: "/docs", label: "Docs" },
  { to: "/faq", label: "FAQ" },
];

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Flovers</span>
          </div>

          <nav className="nav" aria-label="Nawigacja główna">
            {navItems.map((x) => (
              <NavItem key={x.to} to={x.to} label={x.label} />
            ))}
          </nav>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-left">© {new Date().getFullYear()} Flovers</div>
          <div className="footer-right">
            <NavLink className="footer-link" to="/terms">
              Regulamin
            </NavLink>
            <NavLink className="footer-link" to="/privacy-policy">
              Polityka prywatności
            </NavLink>
            <NavLink className="footer-link" to="/contact">
              Kontakt
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
